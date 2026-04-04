import { createServiceClient } from '@/lib/supabase/server'
import { sendShiftReminderEmails, sendLeaveWishReminderEmails } from '@/lib/email'
import { NextResponse } from 'next/server'

// GET /api/cron/remind
// Vercel Cron が毎時 :00 に呼び出す（vercel.json: "0 * * * *"）
// 施設ごとの設定に応じて以下を実行:
//   1. シフト確認督促 — reminder_enabled & 現在時刻 == reminder_hour_jst の施設
//   2. 希望休申請督促 — leave_deadline_day == 今日 & 現在時刻 == reminder_hour_jst の施設
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // 現在の JST 時刻
  const nowUtc       = new Date()
  const nowJst       = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000)
  const nowJstHour   = nowJst.getUTCHours()
  const nowJstDay    = nowJst.getUTCDate()
  const curYear      = nowJst.getUTCFullYear()
  const curMonth     = nowJst.getUTCMonth() + 1

  // 来月
  const nextMonth    = curMonth === 12 ? 1 : curMonth + 1
  const nextYear     = curMonth === 12 ? curYear + 1 : curYear
  const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  const nextStart    = `${nextMonthStr}-01`
  const nextLastDay  = new Date(nextYear, nextMonth, 0).getDate()
  const nextEnd      = `${nextMonthStr}-${String(nextLastDay).padStart(2, '0')}`

  // 今月（シフト確認督促用）
  const curMonthStr  = `${curYear}-${String(curMonth).padStart(2, '0')}`
  const curStart     = `${curMonthStr}-01`
  const curLastDay   = new Date(curYear, curMonth, 0).getDate()
  const curEnd       = `${curMonthStr}-${String(curLastDay).padStart(2, '0')}`

  const service = await createServiceClient()

  // 現在時刻が reminder_hour_jst と一致する施設を取得
  const { data: facilities } = await service
    .from('facilities')
    .select('id, name, reminder_enabled, reminder_hour_jst, leave_deadline_day, leave_min_wishes')
    .eq('reminder_hour_jst', nowJstHour)

  if (!facilities || facilities.length === 0) {
    return NextResponse.json({ ok: true, message: `${nowJstHour}時: 対象施設なし` })
  }

  let shiftSent = 0
  let leaveSent = 0

  for (const facility of facilities) {
    // ── 1. シフト確認督促 ──────────────────────────────────────────────
    if (facility.reminder_enabled) {
      const { data: publishedShifts } = await service
        .from('shifts')
        .select('user_id')
        .eq('facility_id', facility.id)
        .eq('status', 'published')
        .gte('date', curStart)
        .lte('date', curEnd)

      const unconfirmedIds = [...new Set((publishedShifts ?? []).map(s => s.user_id))]
      if (unconfirmedIds.length > 0) {
        const { data: staffList } = await service
          .from('users')
          .select('id, email, display_name')
          .in('id', unconfirmedIds)
          .eq('is_active', true)

        const staff = staffList ?? []
        if (staff.length > 0) {
          await service.from('notifications').insert(
            staff.map(s => ({
              facility_id: facility.id,
              user_id: s.id,
              type: 'shift_reminder',
              message: `${curYear}年${curMonth}月のシフト確認をお願いします`,
            }))
          )
          await sendShiftReminderEmails(
            staff.map(s => ({ email: s.email, displayName: s.display_name })),
            curYear, curMonth, facility.name
          )
          shiftSent += staff.length
        }
      }
    }

    // ── 2. 希望休申請督促 ──────────────────────────────────────────────
    if (facility.leave_deadline_day === nowJstDay) {
      const { data: wishTypes } = await service
        .from('leave_types')
        .select('id')
        .eq('facility_id', facility.id)
        .eq('is_wish', true)

      const wishTypeIds = (wishTypes ?? []).map(t => t.id)
      if (wishTypeIds.length === 0) continue

      const { data: allStaff } = await service
        .from('users')
        .select('id, email, display_name')
        .eq('facility_id', facility.id)
        .eq('role', 'staff')
        .eq('is_active', true)

      if (!allStaff || allStaff.length === 0) continue

      const { data: submitted } = await service
        .from('leave_requests')
        .select('user_id')
        .eq('facility_id', facility.id)
        .in('leave_type_id', wishTypeIds)
        .in('status', ['pending', 'approved'])
        .gte('date', nextStart)
        .lte('date', nextEnd)

      const countMap = new Map<string, number>()
      for (const r of submitted ?? []) {
        countMap.set(r.user_id, (countMap.get(r.user_id) ?? 0) + 1)
      }

      const minWishes = facility.leave_min_wishes ?? 2
      const targets   = allStaff
        .map(s => ({ ...s, submittedCount: countMap.get(s.id) ?? 0 }))
        .filter(s => s.submittedCount < minWishes)

      if (targets.length > 0) {
        await service.from('notifications').insert(
          targets.map(s => ({
            facility_id: facility.id,
            user_id: s.id,
            type: 'leave_wish_reminder',
            message: `${nextYear}年${nextMonth}月分の希望休申請をお願いします（締め切り: ${nowJstDay}日）`,
          }))
        )
        await sendLeaveWishReminderEmails(
          targets.map(s => ({ email: s.email, displayName: s.display_name, submittedCount: s.submittedCount })),
          nextYear, nextMonth, minWishes, nowJstDay, facility.name
        )
        leaveSent += targets.length
      }
    }
  }

  console.log(`[cron/remind] JST ${nowJstHour}時 シフト督促: ${shiftSent}件, 希望休督促: ${leaveSent}件`)
  return NextResponse.json({ ok: true, shiftSent, leaveSent })
}
