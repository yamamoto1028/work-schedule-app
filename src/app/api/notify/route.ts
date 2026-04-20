import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendShiftPublishedEmails, sendShiftReminderEmails, sendLeaveWishReminderEmails } from '@/lib/email'
import { NextResponse } from 'next/server'
import { requireProPlan } from '@/lib/plan/check'

// POST /api/notify  body: { type: ..., facilityId, year, month, targetYear?, targetMonth? }
export async function POST(req: Request) {
  const body = await req.json() as {
    type: string
    facilityId: string
    year: number
    month: number
    targetYear?: number
    targetMonth?: number
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role, facility_id')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (userData.facility_id !== body.facilityId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const planError = await requireProPlan(body.facilityId, supabase)
  if (planError) return planError

  if (body.type === 'shift_published') {
    // 施設名取得
    const { data: facility } = await supabase
      .from('facilities')
      .select('name')
      .eq('id', body.facilityId)
      .single()

    // アクティブスタッフ取得
    const { data: staffList } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('facility_id', body.facilityId)
      .eq('role', 'staff')
      .eq('is_active', true)

    const staff = staffList ?? []
    const message = `${body.year}年${body.month}月のシフトが公開されました`

    // DB 通知挿入（サービスロールで RLS バイパス）
    const service = await createServiceClient()
    await service.from('notifications').insert(
      staff.map(s => ({
        facility_id: body.facilityId,
        user_id: s.id,
        type: 'shift_published',
        message,
      }))
    )

    // メール送信
    await sendShiftPublishedEmails(
      staff.map(s => ({ email: s.email, displayName: s.display_name })),
      body.year, body.month, facility?.name ?? '施設'
    )

    return NextResponse.json({ ok: true, sent: staff.length })
  }

  if (body.type === 'shift_confirmation_reminder') {
    const { year, month } = body
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const startDate = `${monthStr}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`

    const { data: facility } = await supabase
      .from('facilities')
      .select('name')
      .eq('id', body.facilityId)
      .single()

    // published（未確認）シフトを持つスタッフのIDを取得
    const service = await createServiceClient()
    const { data: publishedShifts } = await service
      .from('shifts')
      .select('user_id')
      .eq('facility_id', body.facilityId)
      .eq('status', 'published')
      .gte('date', startDate)
      .lte('date', endDate)

    const unconfirmedUserIds = [...new Set((publishedShifts ?? []).map(s => s.user_id))]
    if (unconfirmedUserIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const { data: staffList } = await supabase
      .from('users')
      .select('id, email, display_name')
      .in('id', unconfirmedUserIds)
      .eq('is_active', true)

    const staff = staffList ?? []
    const message = `${year}年${month}月のシフト確認をお願いします`

    await service.from('notifications').insert(
      staff.map(s => ({
        facility_id: body.facilityId,
        user_id: s.id,
        type: 'shift_reminder',
        message,
      }))
    )

    await sendShiftReminderEmails(
      staff.map(s => ({ email: s.email, displayName: s.display_name })),
      year, month, facility?.name ?? '施設'
    )

    return NextResponse.json({ ok: true, sent: staff.length })
  }

  if (body.type === 'leave_submission_reminder') {
    // targetYear/targetMonth = 希望休の対象月（来月）
    const targetYear  = body.targetYear  ?? body.year
    const targetMonth = body.targetMonth ?? body.month
    const monthStr  = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
    const startDate = `${monthStr}-01`
    const lastDay   = new Date(targetYear, targetMonth, 0).getDate()
    const endDate   = `${monthStr}-${String(lastDay).padStart(2, '0')}`

    const service = await createServiceClient()

    // 施設設定（leave_min_wishes, leave_deadline_day）
    const { data: facility } = await supabase
      .from('facilities')
      .select('name, leave_min_wishes, leave_deadline_day')
      .eq('id', body.facilityId)
      .single()

    const minWishes   = facility?.leave_min_wishes   ?? 2
    const deadlineDay = facility?.leave_deadline_day ?? 25

    // 希望休タイプの ID 一覧（is_wish = true）
    const { data: wishTypes } = await supabase
      .from('leave_types')
      .select('id')
      .eq('facility_id', body.facilityId)
      .eq('is_wish', true)

    const wishTypeIds = (wishTypes ?? []).map(t => t.id)
    if (wishTypeIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: '希望休タイプ未設定' })
    }

    // アクティブスタッフ全員
    const { data: allStaff } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('facility_id', body.facilityId)
      .eq('role', 'staff')
      .eq('is_active', true)

    if (!allStaff || allStaff.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    // 対象月の申請済み希望休（pending or approved）
    const { data: submitted } = await service
      .from('leave_requests')
      .select('user_id')
      .eq('facility_id', body.facilityId)
      .in('leave_type_id', wishTypeIds)
      .in('status', ['pending', 'approved'])
      .gte('date', startDate)
      .lte('date', endDate)

    // スタッフ別提出数を集計
    const countMap = new Map<string, number>()
    for (const r of submitted ?? []) {
      countMap.set(r.user_id, (countMap.get(r.user_id) ?? 0) + 1)
    }

    // 未達スタッフを抽出
    const targets = allStaff
      .map(s => ({ ...s, submittedCount: countMap.get(s.id) ?? 0 }))
      .filter(s => s.submittedCount < minWishes)

    if (targets.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const message = `${targetYear}年${targetMonth}月分の希望休申請をお願いします（締め切り: ${deadlineDay}日）`

    await service.from('notifications').insert(
      targets.map(s => ({
        facility_id: body.facilityId,
        user_id: s.id,
        type: 'leave_wish_reminder',
        message,
      }))
    )

    await sendLeaveWishReminderEmails(
      targets.map(s => ({ email: s.email, displayName: s.display_name, submittedCount: s.submittedCount })),
      targetYear, targetMonth, minWishes, deadlineDay, facility?.name ?? '施設'
    )

    return NextResponse.json({ ok: true, sent: targets.length })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
