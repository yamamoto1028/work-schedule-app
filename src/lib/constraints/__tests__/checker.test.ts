import { describe, expect, it } from 'vitest'
import { checkConstraints } from '../checker'
import type { ConstraintConfig, ShiftEntry } from '../types'

function day(userId: string, date: string, extra: Partial<ShiftEntry> = {}): ShiftEntry {
  return { userId, date, shiftTypeId: 'day', timeZone: 'day', shortName: '日', ...extra }
}
function nov(d: number): string {
  return `2026-11-${String(d).padStart(2, '0')}`
}
function on(key: string, value: Record<string, unknown> = {}): ConstraintConfig {
  return { constraint_key: key, is_enabled: true, value }
}

describe('checkConstraints', () => {
  it('連勤上限が無効なら連勤を警告しない', () => {
    const shifts = [1, 2, 3, 4, 5, 6, 7].map(d => day('a', nov(d)))
    expect(checkConstraints(shifts, [], 2026, 11)).toEqual([])
  })

  it('日中帯のみスタッフは max_consecutive_day_only を使う', () => {
    const shifts = [1, 2, 3, 4].map(d => day('a', nov(d)))
    const v = checkConstraints(shifts, [on('max_consecutive_day_only', { days: 3 }), on('max_consecutive_days', { days: 5 })], 2026, 11)
    expect(v.map(x => x.message)).toEqual(['連続勤務4日目（上限3日）'])
  })

  it('公休数は月別の値を優先する', () => {
    const shifts = Array.from({ length: 22 }, (_, i) => day('a', nov(i + 1)))
    const cfg = [on('min_days_off_per_month', { days: 8, monthly: { '2026-11': 9 } })]
    expect(checkConstraints(shifts, cfg, 2026, 11).map(x => x.message)).toEqual(['休日8日（公休9日に不足）'])
    expect(checkConstraints(shifts, cfg, 2026, 12)).toEqual([])
  })

  it('週の休日不足を警告する（月〜日がすべて月内の週のみ）', () => {
    // 2026-11-02 は月曜
    const shifts = [2, 3, 4, 5, 6, 7].map(d => day('a', nov(d)))
    const v = checkConstraints(shifts, [on('min_weekly_days_off', { days: 2 })], 2026, 11)
    expect(v.map(x => x.message)).toEqual(['週の休日1日（最低2日）'])
  })

  it('半人前職員の同一シフト重複を警告する', () => {
    const shifts = [day('a', nov(1), { staffGrade: 'half' }), day('b', nov(1), { staffGrade: 'new' })]
    const v = checkConstraints(shifts, [on('half_staff_isolation')], 2026, 11)
    expect(v).toHaveLength(1)
    expect(v[0].message).toContain('半人前職員が2名')
  })

  it('夜勤回数の上限（明けは数えない）', () => {
    const shifts: ShiftEntry[] = []
    for (const d of [1, 4, 7]) {
      shifts.push({ userId: 'a', date: nov(d), shiftTypeId: 'n', timeZone: 'night', shortName: '夜' })
      shifts.push({ userId: 'a', date: nov(d + 1), shiftTypeId: 'k', timeZone: 'night', shortName: '明' })
    }
    const v = checkConstraints(shifts, [on('max_night_shifts_per_month', { count: 2 })], 2026, 11)
    expect(v.map(x => x.message)).toEqual(['夜勤3回（上限2回）'])
  })

  it('個人の月最大勤務数を施設設定より優先する', () => {
    const shifts = Array.from({ length: 11 }, (_, i) => day('a', nov(i * 2 + 1), { maxMonthlyShifts: 10 }))
    const v = checkConstraints(shifts, [on('max_monthly_shifts', { shifts: 22 })], 2026, 11)
    expect(v.map(x => x.message)).toEqual(['月間勤務数11日（上限10日）'])
  })

  it('明けの翌日の勤務はエラー', () => {
    const shifts: ShiftEntry[] = [
      { userId: 'a', date: nov(1), shiftTypeId: 'k', timeZone: 'night', shortName: '明' },
      day('a', nov(2)),
    ]
    const v = checkConstraints(shifts, [on('rest_after_night_off')], 2026, 11)
    expect(v.map(x => x.severity)).toEqual(['error'])
  })
})

describe('土日祝休み固定のスタッフ', () => {
  const holidays = ['2026-11-03', '2026-11-23']
  const constraints = [
    on('max_consecutive_day_only', { days: 3 }),
    on('max_consecutive_days', { days: 5 }),
    on('min_days_off_per_month', { days: 12 }),
  ]

  it('平日5連勤でも連勤上限・公休数を警告しない', () => {
    // 2026-11-09〜13（月〜金）の5連勤など、平日をすべて勤務
    const weekdays = Array.from({ length: 30 }, (_, i) => i + 1)
      .filter(d => ![1, 3, 7, 8, 14, 15, 21, 22, 23, 28, 29].includes(d))
    const shifts = weekdays.map(d => day('pt', nov(d), { weekendsHolidaysOff: true }))
    expect(checkConstraints(shifts, constraints, 2026, 11, undefined, holidays)).toEqual([])
  })

  it('土日・祝日のシフトはエラー', () => {
    const shifts = [nov(3), nov(7)].map(d => day('pt', d, { weekendsHolidaysOff: true }))
    const v = checkConstraints(shifts, [], 2026, 11, undefined, holidays)
    expect(v.map(x => [x.date, x.message, x.severity])).toEqual([
      ['2026-11-03', '土日祝休みのスタッフです', 'error'],
      ['2026-11-07', '土日祝休みのスタッフです', 'error'],
    ])
  })

  it('通常のスタッフは従来どおり連勤上限を警告する', () => {
    const shifts = [9, 10, 11, 12].map(d => day('a', nov(d)))
    const v = checkConstraints(shifts, constraints, 2026, 11, undefined, holidays)
    expect(v.map(x => x.message)).toContain('連続勤務4日目（上限3日）')
  })
})
