// 段階②：入れ替えによる改善（焼きなまし法）
// ハード制約を悪化させない入れ替えだけを試し、ペナルティが下がる方向へ進める。

import { EMPTY, ScheduleState } from './context'
import { penalty } from './objective'
import type { Rng } from './random'

type Change = [s: number, pos: number, type: number]

const START_TEMPERATURE = 50
const END_TEMPERATURE = 0.5
const TIME_LIMIT_MS = 5000

export function improve(state: ScheduleState, rng: Rng, iterations: number): void {
  let current = penalty(state)
  let best = current
  let bestSnapshot = state.clone()
  const startedAt = Date.now()

  for (let it = 0; it < iterations; it++) {
    // サーバーレス関数のタイムアウト対策（通常は反復回数で終わる）
    if ((it & 255) === 0 && Date.now() - startedAt > TIME_LIMIT_MS) break
    const temperature = START_TEMPERATURE * (END_TEMPERATURE / START_TEMPERATURE) ** (it / iterations)

    const changes = proposeMove(state, rng)
    if (!changes) continue
    const prev = changes.map(([s, pos]) => state.cells[s][pos])
    if (!state.tryChanges(changes)) continue

    const next = penalty(state)
    const delta = next - current
    if (delta <= 0 || rng() < Math.exp(-delta / temperature)) {
      current = next
      if (current < best) {
        best = current
        bestSnapshot = state.clone()
      }
    } else {
      for (let i = changes.length - 1; i >= 0; i--) state.cells[changes[i][0]][changes[i][1]] = prev[i]
    }
  }

  state.restore(bestSnapshot)
}

function randomInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n)
}

function movable(state: ScheduleState, s: number, pos: number): boolean {
  return state.locked[s][pos] === 0 && state.cells[s][pos] >= 0
}

function movableDayShift(state: ScheduleState, s: number, pos: number): boolean {
  return movable(state, s, pos) && state.ctx.types[state.cells[s][pos]].isDay
}

function proposeMove(state: ScheduleState, rng: Rng): Change[] | null {
  const { ctx } = state
  const S = ctx.staff.length
  if (S === 0) return null
  const r = rng()
  if (r < 0.1 && ctx.rules.requireRespDay) return proposeResponsibleRepair(state, rng)
  const d = randomInt(rng, ctx.D)
  const pos = ctx.P + d
  const a = randomInt(rng, S)

  // 同じ日の日中帯勤務を別のスタッフへ移す
  if (r < 0.3) {
    const b = randomInt(rng, S)
    if (a === b || !movableDayShift(state, a, pos) || !state.isFree(b, pos)) return null
    const t = state.cells[a][pos]
    if (!ctx.staff[b].allowed[t]) return null
    return [[a, pos, EMPTY], [b, pos, t]]
  }

  // 同じスタッフの日中帯勤務を別の日へ移す
  if (r < 0.55) {
    const pos2 = ctx.P + randomInt(rng, ctx.D)
    if (!movableDayShift(state, a, pos) || !state.isFree(a, pos2)) return null
    return [[a, pos, EMPTY], [a, pos2, state.cells[a][pos]]]
  }

  // 2人の勤務日を交換する（日ごとの人数・各自の勤務日数は変わらない）
  if (r < 0.7) {
    const b = randomInt(rng, S)
    const pos2 = ctx.P + randomInt(rng, ctx.D)
    if (a === b || pos === pos2) return null
    if (!movableDayShift(state, a, pos) || !movableDayShift(state, b, pos2)) return null
    if (!state.isFree(a, pos2) || !state.isFree(b, pos)) return null
    const ta = state.cells[a][pos]
    const tb = state.cells[b][pos2]
    // a は d2 に tb を、b は d に ta を引き継ぐ（日ごとの区分別人数も変わらない）
    if (!ctx.staff[a].allowed[tb] || !ctx.staff[b].allowed[ta]) return null
    return [[a, pos, EMPTY], [a, pos2, tb], [b, pos2, EMPTY], [b, pos, ta]]
  }

  // 同じ日の2人の勤務区分を入れ替える（早番 ⇔ 遅番など）
  if (r < 0.8) {
    const b = randomInt(rng, S)
    if (a === b || !movableDayShift(state, a, pos) || !movableDayShift(state, b, pos)) return null
    const ta = state.cells[a][pos]
    const tb = state.cells[b][pos]
    if (ta === tb || !ctx.staff[a].allowed[tb] || !ctx.staff[b].allowed[ta]) return null
    return [[a, pos, tb], [b, pos, ta]]
  }

  // 目標勤務日数に足りないスタッフへ日中帯勤務を足す
  if (r < 0.85) {
    if (!state.isFree(a, pos) || state.workCount(a) >= ctx.staff[a].targetWork) return null
    const t = ctx.dayTypes.find(i => ctx.staff[a].allowed[i])
    return t === undefined ? null : [[a, pos, t]]
  }

  // 夜勤（+ 明け）を別のスタッフへ移す
  const t = state.cells[a][pos]
  if (!movable(state, a, pos) || !ctx.nightTypes.includes(t)) return null
  const b = randomInt(rng, S)
  if (a === b || !ctx.staff[b].allowed[t]) return null
  const block = state.nightBlock(b, d, t)
  if (!block) return null
  const changes: Change[] = [[a, pos, EMPTY], ...block]
  if (ctx.akeType >= 0 && d + 1 < ctx.D) {
    if (!movable(state, a, pos + 1) || state.cells[a][pos + 1] !== ctx.akeType) return null
    changes.push([a, pos + 1, EMPTY])
  }
  return changes
}

/**
 * 日中帯に責任者がいない日へ、責任者の日中帯勤務を移す。
 * 移動元の日に入る別のスタッフがいれば、その人の勤務日と交換する。
 */
function proposeResponsibleRepair(state: ScheduleState, rng: Rng): Change[] | null {
  const { ctx } = state
  const uncovered: number[] = []
  for (let d = 0; d < ctx.D; d++) if (!state.hasResponsibleInZone(d, 'day')) uncovered.push(d)
  if (uncovered.length === 0) return null
  const d = uncovered[randomInt(rng, uncovered.length)]
  const pos = ctx.P + d

  const responsible = ctx.staff.map((st, s) => (st.isResponsible && state.isFree(s, pos) ? s : -1)).filter(s => s >= 0)
  if (responsible.length === 0) return null
  const r = responsible[randomInt(rng, responsible.length)]

  const sources: number[] = []
  for (let d2 = 0; d2 < ctx.D; d2++) if (movableDayShift(state, r, ctx.P + d2)) sources.push(d2)
  if (sources.length === 0) return null
  const pos2 = ctx.P + sources[randomInt(rng, sources.length)]
  const t = state.cells[r][pos2]

  // その日に日中帯で入っている責任者以外のスタッフと勤務日を交換できれば交換する
  const partners = ctx.staff
    .map((st, s) => s)
    .filter(s => !ctx.staff[s].isResponsible && movableDayShift(state, s, pos) && state.isFree(s, pos2))
    .filter(s => ctx.staff[s].allowed[t] && ctx.staff[r].allowed[state.cells[s][pos]])
  if (partners.length > 0 && rng() < 0.7) {
    const b = partners[randomInt(rng, partners.length)]
    const tb = state.cells[b][pos]
    return [[r, pos2, EMPTY], [r, pos, tb], [b, pos, EMPTY], [b, pos2, t]]
  }
  return [[r, pos2, EMPTY], [r, pos, t]]
}
