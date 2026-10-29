// シフト自動作成エンジン
// 段階① construct で制約を満たす土台を作り、段階② improve で入れ替えによりペナルティを下げる。
// 同じ入力・同じ seed なら必ず同じ結果になる。

import { checkConstraints } from '@/lib/constraints/checker'
import type { ShiftEntry } from '@/lib/constraints/types'
import { buildContext, ScheduleState } from './context'
import { construct } from './construct'
import { improve } from './improve'
import { createRng } from './random'
import { computeScores } from './score'
import { openingComment, staffComment, summaryComment } from './commentary'
import type { SchedulerAssignment, SchedulerInput, SchedulerResult, UnfilledSlot } from './types'

export type * from './types'

const DEFAULT_ITERATIONS = 20000

export function generateSchedule(input: SchedulerInput): SchedulerResult {
  const ctx = buildContext(input)
  const state = new ScheduleState(ctx, input)
  const rng = createRng(input.seed)

  const { noCandidate } = construct(state, rng)
  improve(state, rng, input.iterations ?? DEFAULT_ITERATIONS)

  // 新規に追加したシフト
  const assignments: SchedulerAssignment[] = []
  ctx.staff.forEach((st, s) => {
    for (let d = 0; d < ctx.D; d++) {
      const pos = ctx.P + d
      const t = state.cells[s][pos]
      if (t >= 0 && state.locked[s][pos] === 0) {
        assignments.push({ userId: st.id, date: ctx.dates[d], shiftTypeId: ctx.types[t].id })
      }
    }
  })

  // 最低配置人数を満たせなかった枠
  const unfilled: UnfilledSlot[] = []
  for (let d = 0; d < ctx.D; d++) {
    ctx.required.forEach((required, t) => {
      if (required <= 0) return
      const assigned = state.countOnDay(d, t)
      if (assigned >= required) return
      unfilled.push({
        date: ctx.dates[d],
        shiftTypeId: ctx.types[t].id,
        shiftTypeName: ctx.types[t].name,
        required,
        assigned,
        reason: noCandidate.get(`${d}_${t}`) ?? '制約を満たす配置が見つかりませんでした',
      })
    })
  }

  // 既存 + 新規シフト全体を制約チェッカーで検証する
  const entries: ShiftEntry[] = []
  ctx.staff.forEach((st, s) => {
    for (let d = 0; d < ctx.D; d++) {
      const t = state.cells[s][ctx.P + d]
      if (t < 0 || ctx.types[t].id === '__unknown__') continue
      const type = ctx.types[t]
      entries.push({
        userId: st.id,
        date: ctx.dates[d],
        shiftTypeId: type.id,
        timeZone: type.isNight ? 'night' : 'day',
        shortName: type.shortName,
        shiftTypeName: type.name,
        responsibleRoleName: st.responsibleRoleName,
        allowedShiftTypeIds: st.allowedShiftTypeIds,
        staffGrade: st.staffGrade,
        maxMonthlyShifts: st.maxMonthlyShifts,
        weekendsHolidaysOff: st.weekendsHolidaysOff,
      })
    }
  })
  const violations = checkConstraints(
    entries,
    input.constraints,
    input.year,
    input.month,
    new Map(input.shiftTypes.map(t => [t.id, t.name])),
    input.holidays,
  )

  const raw = computeScores(state)
  const scores = raw.map((r, s) => ({
    userId: ctx.staff[s].id,
    ...r,
    comment: staffComment(r.reason, ctx.staff[s].id, input.seed),
  }))
  const overallScore = scores.length === 0
    ? 0
    : Math.round(scores.reduce((acc, s) => acc + s.score, 0) / scores.length)

  return {
    assignments,
    unfilled,
    violations,
    scores,
    overallScore,
    openingComment: openingComment(
      input.facilityType,
      { staffCount: ctx.staff.length, leaveCount: input.leaves.length, month: input.month },
      input.seed,
    ),
    summaryComment: summaryComment(
      input.facilityType,
      {
        unfilledCount: unfilled.length,
        errorCount: violations.filter(v => v.severity === 'error').length,
        overallScore,
      },
      input.seed,
    ),
    seed: input.seed,
  }
}
