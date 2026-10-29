// ソフト制約のペナルティ（小さいほど良いシフト）
// 重みは REQUIREMENTS.md 4.5「制約の適用優先度」の順に大きくしている。

import { ScheduleState } from './context'

export const WEIGHTS = {
  unfilled: 1000, // 最低配置人数の不足（1名あたり）
  fixedNight: 300, // fixed_night_count との差（1回あたり）
  responsible: 800, // 責任者不在（1日・1時間帯あたり）
  interval: 300, // 指定責任者の夜勤がない期間
  workShortfall: 150, // 目標勤務日数との差（1日あたり）
  weeklyOff: 100, // 週休の不足（1日あたり）
  halfDuplicate: 80, // 半人前職員の重複（1名あたり）
  nightVariance: 20, // 夜勤回数のばらつき
  weekendVariance: 5, // 土日祝出勤のばらつき
  scattered: 3, // 飛び石休み（勤務に挟まれた1日だけの休み）
  dailyVariance: 2, // 日中帯人数の日ごとのばらつき
}

export function penalty(state: ScheduleState): number {
  const { ctx } = state
  const { P, D, rules, staff } = ctx
  let total = 0

  for (let d = 0; d < D; d++) {
    for (let t = 0; t < ctx.types.length; t++) {
      if (ctx.required[t] > 0) total += WEIGHTS.unfilled * Math.max(0, ctx.required[t] - state.countOnDay(d, t))
      if (rules.halfIsolation) total += WEIGHTS.halfDuplicate * Math.max(0, state.halfCountOnDay(d, t) - 1)
    }
    if (rules.requireRespDay && state.zoneCountOnDay(d, 'day') > 0 && !state.hasResponsibleInZone(d, 'day')) {
      total += WEIGHTS.responsible
    }
    if (rules.requireRespNight && state.zoneCountOnDay(d, 'night') > 0 && !state.hasResponsibleInZone(d, 'night')) {
      total += WEIGHTS.responsible
    }
  }

  if (rules.interval) {
    for (const [a, b] of ctx.intervalWindows) {
      if (!state.hasRoleNightInWindow(a, b, rules.interval.roleName)) total += WEIGHTS.interval
    }
  }

  const nightCounts: number[] = []
  const weekendCounts: number[] = []
  for (let s = 0; s < staff.length; s++) {
    const st = staff[s]
    const row = state.cells[s]
    total += WEIGHTS.workShortfall * Math.abs(st.targetWork - state.workCount(s))

    const nights = state.nightCount(s)
    if (st.fixedNightCount != null) total += WEIGHTS.fixedNight * Math.abs(st.fixedNightCount - nights)
    else if (!st.reservedForDay && ctx.nightTypes.some(t => st.allowed[t])) nightCounts.push(nights)

    // 土日祝休み固定のスタッフは土日祝出勤の均等化の対象外
    if (st.targetWork > 0 && !st.weekendsHolidaysOff) weekendCounts.push(state.weekendCount(s))

    if (rules.minWeeklyOff !== null) {
      for (const [a, b] of ctx.weeks) {
        let work = 0
        for (let d = a; d < b; d++) if (row[P + d] >= 0) work++
        total += WEIGHTS.weeklyOff * Math.max(0, rules.minWeeklyOff - (7 - work))
      }
    }

    for (let i = P; i < P + D - 1; i++) {
      if (row[i] === -1 && row[i - 1] >= 0 && row[i + 1] >= 0) total += WEIGHTS.scattered
    }
  }

  if (rules.equalNight) total += WEIGHTS.nightVariance * sumSquaredDeviation(nightCounts)
  total += WEIGHTS.weekendVariance * sumSquaredDeviation(weekendCounts)

  const dayCounts: number[] = []
  for (let d = 0; d < D; d++) dayCounts.push(state.zoneCountOnDay(d, 'day'))
  total += WEIGHTS.dailyVariance * sumSquaredDeviation(dayCounts)

  return total
}

function sumSquaredDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0)
}
