import type { ConstraintConfig } from '@/lib/constraints/types'
import type { SchedulerInput, SchedulerShiftType, SchedulerStaff } from '../types'

export const SHIFT_TYPES: SchedulerShiftType[] = [
  { id: 'early', name: '早番', shortName: '早', timeZone: 'day' },
  { id: 'day', name: '日勤', shortName: '日', timeZone: 'day' },
  { id: 'late', name: '遅番', shortName: '遅', timeZone: 'day' },
  { id: 'night', name: '夜勤', shortName: '夜', timeZone: 'night' },
  { id: 'ake', name: '明け', shortName: '明', timeZone: 'night' },
]

// デモ施設（002_seed_demo.sql）の既定値 + 責任者配置・最低人数
export const CONSTRAINTS: ConstraintConfig[] = [
  { constraint_key: 'rest_after_night_off', is_enabled: true, value: {} },
  { constraint_key: 'no_day_shift_after_night', is_enabled: true, value: {} },
  { constraint_key: 'max_consecutive_day_only', is_enabled: true, value: { days: 3 } },
  { constraint_key: 'max_consecutive_with_night', is_enabled: true, value: { days: 4 } },
  { constraint_key: 'max_consecutive_days', is_enabled: true, value: { days: 5 } },
  { constraint_key: 'min_days_off_per_month', is_enabled: true, value: { days: 8, monthly: { '2026-11': 9 } } },
  { constraint_key: 'min_weekly_days_off', is_enabled: true, value: { days: 2 } },
  { constraint_key: 'max_monthly_shifts', is_enabled: true, value: { shifts: 22 } },
  { constraint_key: 'night_shift_equal_distribution', is_enabled: true, value: {} },
  { constraint_key: 'max_night_shifts_per_month', is_enabled: true, value: { count: 8 } },
  { constraint_key: 'half_staff_isolation', is_enabled: true, value: {} },
  { constraint_key: 'require_responsible_day_zone', is_enabled: true, value: {} },
  { constraint_key: 'require_responsible_night_zone', is_enabled: false, value: {} },
  { constraint_key: 'min_staff_per_shift_type', is_enabled: true, value: { early: 1, day: 2, late: 1 } },
]

function staff(id: string, overrides: Partial<SchedulerStaff> = {}): SchedulerStaff {
  return {
    id,
    name: id,
    canNightShift: true,
    staffGrade: 'full',
    maxMonthlyShifts: null,
    fixedNightCount: null,
    responsibleRoleName: null,
    allowedShiftTypeIds: [],
    ...overrides,
  }
}

export const STAFF: SchedulerStaff[] = [
  staff('chief', { responsibleRoleName: '主任' }),
  staff('subchief', { responsibleRoleName: '副主任' }),
  staff('s1'),
  staff('s2'),
  staff('s3'),
  staff('s4', { fixedNightCount: 6 }),
  staff('s5'),
  staff('s6', { canNightShift: false }),
  staff('s7', { canNightShift: false, allowedShiftTypeIds: ['early'] }),
  staff('half1', { staffGrade: 'half' }),
  staff('new1', { staffGrade: 'new', canNightShift: false }),
  staff('part', { canNightShift: false, maxMonthlyShifts: 12 }),
]

export function baseInput(overrides: Partial<SchedulerInput> = {}): SchedulerInput {
  return {
    facilityType: 'care_facility',
    year: 2026,
    month: 11,
    staff: STAFF,
    shiftTypes: SHIFT_TYPES,
    constraints: CONSTRAINTS,
    daysOff: 9,
    leaves: [
      { userId: 's1', date: '2026-11-03', countsAsDayOff: true },
      { userId: 's1', date: '2026-11-04', countsAsDayOff: true },
      { userId: 's2', date: '2026-11-10', countsAsDayOff: false },
      { userId: 'chief', date: '2026-11-20', countsAsDayOff: true },
      { userId: 's6', date: '2026-11-15', countsAsDayOff: false },
      { userId: 's6', date: '2026-11-16', countsAsDayOff: false },
    ],
    fixedShifts: [
      { userId: 's3', date: '2026-11-05', shiftTypeId: 'early' },
      { userId: 'subchief', date: '2026-11-12', shiftTypeId: 'night' },
      { userId: 'subchief', date: '2026-11-13', shiftTypeId: 'ake' },
    ],
    previousShifts: [],
    holidays: ['2026-11-03', '2026-11-23'],
    seed: 1,
    iterations: 8000,
    ...overrides,
  }
}
