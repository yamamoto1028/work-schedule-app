import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendLeaveApprovedEmail, sendLeaveRejectedEmail } from '@/lib/email'
import { getMonthRange } from '@/lib/utils'
import { NextResponse } from 'next/server'

// GET /api/leaves?facilityId=&from=&to=&status=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const facilityId = searchParams.get('facilityId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')

  if (!facilityId) return NextResponse.json({ error: 'facilityId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabase
    .from('leave_requests')
    .select('user_id, date, leave_types(name)')
    .eq('facility_id', facilityId)

  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  if (status) query = query.eq('status', status as 'pending' | 'approved' | 'rejected')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map((r) => ({
    user_id: r.user_id,
    date: r.date,
    leave_type_name: (r.leave_types as { name: string } | null)?.name ?? '',
  }))

  return NextResponse.json(result)
}

// PATCH /api/leaves  body: { id, status: 'approved'|'rejected' }
export async function PATCH(req: Request) {
  const body = await req.json() as { id: string; status: 'approved' | 'rejected' | 'pending' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 管理者確認
  const { data: userData } = await supabase
    .from('users')
    .select('role, facility_id')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 申請情報取得（メール送信用）
  const { data: leave, error: leaveError } = await supabase
    .from('leave_requests')
    .select('id, date, facility_id, user_id, leave_type_id, leave_types(name), users!user_id(email, display_name)')
    .eq('id', body.id)
    .eq('facility_id', userData.facility_id!)
    .single()

  if (leaveError || !leave) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 差し戻し（pending に戻す）は上限チェック・通知なしで即更新
  if (body.status === 'pending') {
    await supabase.from('leave_requests').update({ status: 'pending', reviewed_by: null }).eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  // 承認時：月上限チェック
  if (body.status === 'approved') {
    const leaveTypeId = leave.leave_type_id
    if (leaveTypeId) {
      const { data: ltData } = await supabase
        .from('leave_types')
        .select('monthly_limit, name')
        .eq('id', leaveTypeId)
        .single()
      const monthlyLimit: number | null = ltData?.monthly_limit ?? null
      if (monthlyLimit !== null) {
        // YYYY-MM から月初・翌月初を算出
        const yearMonth = leave.date.slice(0, 7)
        const { start, nextMonthStart } = getMonthRange(yearMonth)
        const { count } = await supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('facility_id', userData.facility_id!)
          .eq('leave_type_id', leaveTypeId)
          .eq('status', 'approved')
          .gte('date', start)
          .lt('date', nextMonthStart)
        if ((count ?? 0) >= monthlyLimit) {
          return NextResponse.json(
            { error: `${ltData?.name ?? '該当区分'} の月間承認上限（${monthlyLimit}件）に達しています` },
            { status: 422 }
          )
        }
      }
    }
  }

  // ステータス更新
  const { error: updateError } = await supabase
    .from('leave_requests')
    .update({ status: body.status, reviewed_by: user.id })
    .eq('id', body.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const staffUser = leave.users as { id?: string; email: string; display_name: string } | null
  const leaveType = leave.leave_types as { name: string } | null
  const leaveTypeName = leaveType?.name ?? '休暇'
  const isApproved = body.status === 'approved'
  const notifMessage = isApproved
    ? `${leave.date} の${leaveTypeName}申請が承認されました`
    : `${leave.date} の${leaveTypeName}申請が却下されました`

  // アプリ内通知挿入
  if (staffUser) {
    const service = await createServiceClient()
    await service.from('notifications').insert({
      facility_id: leave.facility_id,
      user_id: leave.user_id,
      type: isApproved ? 'leave_approved' : 'leave_rejected',
      message: notifMessage,
    })
  }

  // メール送信
  if (staffUser?.email) {
    if (isApproved) {
      await sendLeaveApprovedEmail(staffUser.email, staffUser.display_name, leave.date, leaveTypeName)
    } else {
      await sendLeaveRejectedEmail(staffUser.email, staffUser.display_name, leave.date, leaveTypeName)
    }
  }

  return NextResponse.json({ ok: true })
}
