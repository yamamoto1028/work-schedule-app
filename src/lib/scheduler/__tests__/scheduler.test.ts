import { describe, expect, it } from 'vitest'
import { generateSchedule } from '../index'
import { buildContext, ScheduleState } from '../context'
import { baseInput, SHIFT_TYPES } from './fixtures'
import type { SchedulerAssignment, SchedulerInput } from '../types'
import { getDatesInMonth, addDays } from '@/lib/constraints/rules'

function allShifts(input: SchedulerInput, assignments: SchedulerAssignment[]): SchedulerAssignment[] {
  return [...input.fixedShifts, ...assignments]
}

function cellOf(shifts: SchedulerAssignment[], userId: string, date: string): string | undefined {
  return shifts.find(s => s.userId === userId && s.date === date)?.shiftTypeId
}

describe('generateSchedule', () => {
  const input = baseInput()
  const result = generateSchedule(input)
  const shifts = allShifts(input, result.assignments)
  const dates = getDatesInMonth(2026, 11)

  it('制約チェッカーのエラーが0件で、最低人数もすべて満たす', () => {
    expect(result.violations.filter(v => v.severity === 'error')).toEqual([])
    expect(result.unfilled).toEqual([])
  })

  it('ハード制約の違反量が全スタッフ0', () => {
    const ctx = buildContext(input)
    const state = new ScheduleState(ctx, input)
    const typeIndex = new Map(ctx.types.map((t, i) => [t.id, i]))
    const staffIndex = new Map(ctx.staff.map((s, i) => [s.id, i]))
    for (const a of result.assignments) {
      state.cells[staffIndex.get(a.userId)!][ctx.P + dates.indexOf(a.date)] = typeIndex.get(a.shiftTypeId)!
    }
    ctx.staff.forEach((_, s) => expect(state.hardCost(s)).toBe(0))
  })

  it('毎日夜勤が1名以上いて、夜勤の翌日は明け・明けの翌日は休み', () => {
    for (const date of dates) {
      expect(shifts.filter(s => s.date === date && s.shiftTypeId === 'night').length).toBeGreaterThanOrEqual(1)
    }
    for (const s of shifts.filter(x => x.shiftTypeId === 'night')) {
      const next = addDays(s.date, 1)
      if (!dates.includes(next)) continue
      expect(cellOf(shifts, s.userId, next)).toBe('ake')
      const after = addDays(s.date, 2)
      if (dates.includes(after)) expect(cellOf(shifts, s.userId, after)).toBeUndefined()
    }
  })

  it('公休数は固定（希望休は公休に含み、有給は別枠）', () => {
    for (const st of input.staff) {
      const work = shifts.filter(s => s.userId === st.id).length
      const leaves = input.leaves.filter(l => l.userId === st.id)
      const wish = leaves.filter(l => l.countsAsDayOff).length
      const other = leaves.length - wish
      const expected = Math.min(dates.length - Math.max(input.daysOff, wish) - other, st.maxMonthlyShifts ?? 22)
      expect({ id: st.id, work }).toEqual({ id: st.id, work: expected })
    }
  })

  it('休暇日・既存シフトは変更しない', () => {
    for (const l of input.leaves) expect(cellOf(result.assignments, l.userId, l.date)).toBeUndefined()
    for (const f of input.fixedShifts) expect(cellOf(result.assignments, f.userId, f.date)).toBeUndefined()
  })

  it('許可シフト・夜勤不可を守る', () => {
    const byId = new Map(input.staff.map(s => [s.id, s]))
    for (const a of result.assignments) {
      const st = byId.get(a.userId)!
      if (st.allowedShiftTypeIds.length > 0) expect(st.allowedShiftTypeIds).toContain(a.shiftTypeId)
      const type = SHIFT_TYPES.find(t => t.id === a.shiftTypeId)!
      if (!st.canNightShift) expect(type.timeZone).toBe('day')
    }
  })

  it('fixed_night_count の回数どおりに夜勤を入れる', () => {
    expect(shifts.filter(s => s.userId === 's4' && s.shiftTypeId === 'night').length).toBe(6)
  })

  it('同じ seed なら同じ結果、seed を変えると別案になる', () => {
    const again = generateSchedule(baseInput())
    expect(again.assignments).toEqual(result.assignments)
    const other = generateSchedule(baseInput({ seed: 2 }))
    expect(other.assignments).not.toEqual(result.assignments)
  })

  it('不満スコアは 0〜100 で全スタッフ分ある', () => {
    expect(result.scores).toHaveLength(input.staff.length)
    for (const s of result.scores) {
      expect(s.score).toBeGreaterThanOrEqual(0)
      expect(s.score).toBeLessThanOrEqual(100)
      expect(s.comment).not.toBe('')
    }
  })
})

describe('前月からの引き継ぎ', () => {
  it('前月末が夜勤なら1日は明け、2日は休み', () => {
    const input = baseInput({
      previousShifts: [{ userId: 's2', date: '2026-10-31', shiftTypeId: 'night' }],
    })
    const result = generateSchedule(input)
    expect(cellOf(result.assignments, 's2', '2026-11-01')).toBe('ake')
    expect(cellOf(result.assignments, 's2', '2026-11-02')).toBeUndefined()
  })

  it('前月末からの連勤を数える', () => {
    const prev = ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'].map(date => ({
      userId: 's6', date, shiftTypeId: 'day',
    }))
    const result = generateSchedule(baseInput({ previousShifts: prev }))
    // 日中帯のみスタッフの連勤上限は3日なので、1日は休み
    expect(cellOf(result.assignments, 's6', '2026-11-01')).toBeUndefined()
  })
})

describe('人が足りないとき', () => {
  it('夜勤できるスタッフが足りなければ未充足として理由つきで返す', () => {
    const base = baseInput()
    const input = baseInput({
      staff: base.staff.map(s => (s.id === 'chief' ? s : { ...s, canNightShift: false })),
    })
    const result = generateSchedule(input)
    const nightUnfilled = result.unfilled.filter(u => u.shiftTypeId === 'night')
    expect(nightUnfilled.length).toBeGreaterThan(0)
    expect(nightUnfilled[0].reason).toContain('配置できるスタッフがいません')
  })
})
