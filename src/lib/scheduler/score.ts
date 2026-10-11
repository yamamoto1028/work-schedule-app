// 不満スコア（0〜100、高いほど不満）をシフト内容から計算する

import { EMPTY, ScheduleState } from './context'
import type { ScoreReason } from './types'

export type RawScore = {
  score: number
  reason: ScoreReason
  workDays: number
  targetWorkDays: number
  nightCount: number
  weekendCount: number
  maxConsecutive: number
}

export function computeScores(state: ScheduleState): RawScore[] {
  const { ctx } = state
  const { P, D } = ctx
  const nightStaff = ctx.staff.map((st, s) => (st.canNightShift ? state.nightCount(s) : -1)).filter(n => n >= 0)
  const avgNight = average(nightStaff)
  const avgWeekend = average(ctx.staff.map((_, s) => state.weekendCount(s)))

  return ctx.staff.map((st, s) => {
    const row = state.cells[s]
    const workDays = state.workCount(s)
    const nightCount = state.nightCount(s)
    const weekendCount = state.weekendCount(s)
    const maxConsecutive = state.maxConsecutive(s)

    let scattered = 0
    for (let i = P; i < P + D - 1; i++) {
      if (row[i] === EMPTY && row[i - 1] >= 0 && row[i + 1] >= 0) scattered++
    }
    let weeklyShort = 0
    if (ctx.rules.minWeeklyOff !== null) {
      for (const [a, b] of ctx.weeks) {
        let work = 0
        for (let d = a; d < b; d++) if (row[P + d] >= 0) work++
        weeklyShort += Math.max(0, ctx.rules.minWeeklyOff - (7 - work))
      }
    }

    const parts: Array<[ScoreReason, number]> = [
      ['consecutive', Math.max(0, maxConsecutive - 3) * 12],
      ['night', st.canNightShift ? Math.max(0, nightCount - avgNight) * 10 : 0],
      ['weekend', Math.max(0, weekendCount - avgWeekend) * 8],
      ['scattered', scattered * 4],
      ['weekly_off', weeklyShort * 12],
      // 勤務日数が目標に届かない（シフトに入れてもらえない）不満
      ['shortfall', Math.max(0, st.targetWork - workDays) * 6],
    ]
    const total = parts.reduce((acc, [, v]) => acc + v, 0)
    const [topReason, topValue] = parts.reduce((a, b) => (b[1] > a[1] ? b : a))
    return {
      score: Math.min(100, Math.round(10 + total)),
      reason: topValue > 0 ? topReason : 'none',
      workDays,
      targetWorkDays: st.targetWork,
      nightCount,
      weekendCount,
      maxConsecutive,
    }
  })
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}
