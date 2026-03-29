import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendShiftPublishedEmails } from '@/lib/email'
import { NextResponse } from 'next/server'

// POST /api/notify  body: { type: 'shift_published', facilityId, year, month }
export async function POST(req: Request) {
  const body = await req.json() as { type: string; facilityId: string; year: number; month: number }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).from('notifications').insert(
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

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
