import { NextResponse } from 'next/server'
import HolidayJP from '@holiday-jp/holiday_jp'
import { createClient } from '@/lib/supabase/server'
import { requireProPlan } from '@/lib/plan/check'
import { addDays, getDatesInMonth, resolveMonthlyDaysOff } from '@/lib/constraints/rules'
import type { ConstraintConfig } from '@/lib/constraints/types'
import { generateSchedule } from '@/lib/scheduler'
import type { SchedulerStaff } from '@/lib/scheduler'

export const maxDuration = 30

type Body = {
  facilityId?: string
  month?: string // YYYY-MM
  blockId?: string | null
  seed?: number
}

type StaffProfileRow = {
  can_night_shift: boolean
  staff_grade: 'full' | 'half' | 'new'
  max_monthly_shifts: number | null
  fixed_night_count: number | null
  allowed_shift_type_ids: string[]
  block_id: string | null
  responsible_roles: { name: string } | null
}

// POST /api/shifts/generate  ルールベースのシフト自動作成（プレビュー用。保存はしない）
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null
  const facilityId = body?.facilityId
  const month = body?.month
  if (!facilityId || !month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: 'facilityId と month（YYYY-MM）は必須です' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role, facility_id')
    .eq('id', user.id)
    .single()
  if (userData?.role !== 'admin' || userData.facility_id !== facilityId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const planError = await requireProPlan(facilityId, supabase)
  if (planError) return planError

  const [year, monthNum] = month.split('-').map(Number)
  const dates = getDatesInMonth(year, monthNum)
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]

  const [facilityResult, staffResult, shiftTypesResult, constraintsResult, leavesResult, shiftsResult, prevShiftsResult] =
    await Promise.all([
      supabase.from('facilities').select('type').eq('id', facilityId).single(),
      supabase
        .from('users')
        .select(`
          id, display_name,
          staff_profiles(
            can_night_shift, staff_grade, max_monthly_shifts, fixed_night_count,
            allowed_shift_type_ids, block_id,
            responsible_roles(name)
          )
        `)
        .eq('facility_id', facilityId)
        .eq('role', 'staff')
        .eq('is_active', true)
        .order('created_at'),
      supabase
        .from('shift_types')
        .select('id, name, short_name, time_zone')
        .eq('facility_id', facilityId)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('constraint_settings')
        .select('constraint_key, is_enabled, value')
        .eq('facility_id', facilityId),
      supabase
        .from('leave_requests')
        .select('user_id, date, leave_types(is_wish)')
        .eq('facility_id', facilityId)
        .eq('status', 'approved')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('shifts')
        .select('user_id, shift_type_id, date')
        .eq('facility_id', facilityId)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('shifts')
        .select('user_id, shift_type_id, date')
        .eq('facility_id', facilityId)
        .gte('date', addDays(startDate, -7))
        .lt('date', startDate),
    ])

  const queryError = [staffResult, shiftTypesResult, constraintsResult, leavesResult, shiftsResult, prevShiftsResult]
    .find(r => r.error)?.error
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 })

  const blockId = body?.blockId ?? null
  const staff: SchedulerStaff[] = (staffResult.data ?? [])
    .map(u => ({ user: u, profile: u.staff_profiles as StaffProfileRow | null }))
    .filter(({ profile }) => !blockId || profile?.block_id === blockId)
    .map(({ user: u, profile }) => ({
      id: u.id,
      name: u.display_name,
      canNightShift: profile?.can_night_shift ?? false,
      staffGrade: profile?.staff_grade ?? 'full',
      maxMonthlyShifts: profile?.max_monthly_shifts ?? null,
      fixedNightCount: profile?.fixed_night_count ?? null,
      responsibleRoleName: profile?.responsible_roles?.name ?? null,
      allowedShiftTypeIds: profile?.allowed_shift_type_ids ?? [],
    }))
  const staffIds = new Set(staff.map(s => s.id))

  const constraints: ConstraintConfig[] = (constraintsResult.data ?? []).map(c => ({
    constraint_key: c.constraint_key,
    is_enabled: c.is_enabled,
    value: (c.value as Record<string, unknown> | null) ?? {},
  }))

  const toAssignment = (s: { user_id: string; shift_type_id: string; date: string }) => ({
    userId: s.user_id,
    date: s.date,
    shiftTypeId: s.shift_type_id,
  })

  const seed = typeof body?.seed === 'number' && Number.isInteger(body.seed)
    ? body.seed
    : Math.floor(Math.random() * 1_000_000)

  const result = generateSchedule({
    facilityType: facilityResult.data?.type === 'hospital' ? 'hospital' : 'care_facility',
    year,
    month: monthNum,
    staff,
    shiftTypes: (shiftTypesResult.data ?? []).map(t => ({
      id: t.id,
      name: t.name,
      shortName: t.short_name,
      timeZone: t.time_zone,
    })),
    constraints,
    daysOff: resolveMonthlyDaysOff(constraints.find(c => c.constraint_key === 'min_days_off_per_month'), month),
    leaves: (leavesResult.data ?? [])
      .filter(l => staffIds.has(l.user_id))
      .map(l => ({
        userId: l.user_id,
        date: l.date,
        // 希望休は公休に含め、有給などは公休とは別枠の休みとして扱う
        countsAsDayOff: (l.leave_types as { is_wish: boolean } | null)?.is_wish ?? false,
      })),
    fixedShifts: (shiftsResult.data ?? []).filter(s => staffIds.has(s.user_id)).map(toAssignment),
    previousShifts: (prevShiftsResult.data ?? []).filter(s => staffIds.has(s.user_id)).map(toAssignment),
    // holiday_jp はローカル時刻で日付を判定するため、ローカル時刻の Date を渡す
    holidays: dates.filter((_, i) => HolidayJP.isHoliday(new Date(year, monthNum - 1, i + 1))),
    seed,
  })

  return NextResponse.json(result)
}
