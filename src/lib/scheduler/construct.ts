// 段階①：土台づくり（制約を満たす割り当てを順番に作る）

import type { Rng } from './random'
import { ScheduleState } from './context'

type Slot = { d: number; t: number }

export type ConstructResult = {
  // 候補者がいなかった枠（日付 × 勤務区分 → 不足理由）
  noCandidate: Map<string, string>
}

export function construct(state: ScheduleState, rng: Rng): ConstructResult {
  const noCandidate = new Map<string, string>()
  carryOverAke(state)
  fillRequired(state, rng, state.ctx.nightTypes, noCandidate)
  fillResponsibleDay(state, rng)
  fillRequired(state, rng, state.ctx.dayTypes, noCandidate)
  fillWorkDays(state, rng)
  return { noCandidate }
}

// 前月末が夜勤のスタッフは1日を明けにする
function carryOverAke(state: ScheduleState): void {
  const { ctx } = state
  if (ctx.akeType < 0) return
  ctx.staff.forEach((_, s) => {
    const last = state.cells[s][ctx.P - 1]
    if (last >= 0 && ctx.nightTypes.includes(last) && state.isFree(s, ctx.P)) {
      state.tryChanges([[s, ctx.P, ctx.akeType]])
    }
  })
}

function changesFor(state: ScheduleState, s: number, slot: Slot): Array<[number, number, number]> | null {
  const { ctx } = state
  if (!ctx.staff[s].allowed[slot.t]) return null
  if (ctx.types[slot.t].isNight) return state.nightBlock(s, slot.d, slot.t)
  return state.isFree(s, ctx.P + slot.d) ? [[s, ctx.P + slot.d, slot.t]] : null
}

/** 配置してもハード制約違反が増えないか（スタッフ s の行だけで決まる） */
function canPlace(state: ScheduleState, s: number, slot: Slot): boolean {
  const changes = changesFor(state, s, slot)
  if (!changes) return false
  const snapshot = changes.map(([ss, pos]) => state.cells[ss][pos])
  if (!state.tryChanges(changes)) return false
  changes.forEach(([ss, pos], i) => (state.cells[ss][pos] = snapshot[i]))
  return true
}

function pickBest(state: ScheduleState, candidates: Iterable<number>, slotOf: (s: number) => Slot, rng: Rng): number {
  let best = -1
  let bestScore = Infinity
  for (const s of candidates) {
    const sc = candidateScore(state, s, slotOf(s), rng)
    if (sc < bestScore) {
      bestScore = sc
      best = s
    }
  }
  return best
}

function candidateScore(state: ScheduleState, s: number, slot: Slot, rng: Rng): number {
  const { ctx } = state
  const st = ctx.staff[s]
  const { rules } = ctx
  const isNight = ctx.types[slot.t].isNight
  let score = 0

  if (isNight) {
    const nights = state.nightCount(s)
    if (st.fixedNightCount != null) score -= 200 * (st.fixedNightCount - nights)
    if (rules.requireRespNight && st.isResponsible && !state.hasResponsibleInZone(slot.d, 'night')) score -= 500
    if (rules.interval && st.responsibleRoleName === rules.interval.roleName) {
      const w = ctx.intervalWindows.find(([a, b]) => slot.d >= a && slot.d < b)
      if (w && !state.hasRoleNightInWindow(w[0], w[1], rules.interval.roleName)) score -= 400
    }
    score += (rules.equalNight ? 60 : 15) * nights
    if (st.reservedForDay) score += 1000
  } else {
    if (rules.requireRespDay && st.isResponsible && !state.hasResponsibleInZone(slot.d, 'day')) score -= 300
    if (ctx.weekendOrHoliday[slot.d]) score += 8 * state.weekendCount(s)
  }

  if (rules.halfIsolation && st.isHalf && state.halfCountOnDay(slot.d, slot.t) > 0) score += 300
  score -= 10 * (st.targetWork - state.workCount(s))
  return score + rng() * 10
}

/**
 * 最低配置人数を埋める。候補者が最も少ない枠から順に決める（MRV）。
 * 配置で変わるのは配置したスタッフの行だけなので、候補リストはそのスタッフ分だけ更新する。
 */
function fillRequired(state: ScheduleState, rng: Rng, typeIndices: number[], noCandidate: Map<string, string>): void {
  const { ctx } = state
  const allStaff = ctx.staff.map((_, s) => s)
  const open: Array<Slot & { remaining: number; cands: Set<number> }> = []
  for (const t of typeIndices) {
    if (ctx.required[t] <= 0) continue
    for (let d = 0; d < ctx.D; d++) {
      const remaining = ctx.required[t] - state.countOnDay(d, t)
      if (remaining <= 0) continue
      open.push({ d, t, remaining, cands: new Set(allStaff.filter(s => canPlace(state, s, { d, t }))) })
    }
  }

  while (open.length > 0) {
    let bestIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].cands.size < open[bestIdx].cands.size) bestIdx = i
    }
    const slot = open[bestIdx]
    if (slot.cands.size === 0) {
      noCandidate.set(`${slot.d}_${slot.t}`, explainNoCandidate(state, slot))
      open.splice(bestIdx, 1)
      continue
    }
    const best = pickBest(state, slot.cands, () => slot, rng)
    state.tryChanges(changesFor(state, best, slot)!)
    if (--slot.remaining === 0) open.splice(bestIdx, 1)
    for (const o of open) {
      if (canPlace(state, best, o)) o.cands.add(best)
      else o.cands.delete(best)
    }
  }
}

/** 日中帯に責任者がいない日へ責任者を配置する（候補の少ない日から順に） */
function fillResponsibleDay(state: ScheduleState, rng: Rng): void {
  const { ctx } = state
  if (!ctx.rules.requireRespDay) return
  // 責任者ごとに入れる日中帯区分（許可された最初の区分）
  const respType = new Map<number, number>()
  ctx.staff.forEach((st, s) => {
    const t = ctx.dayTypes.find(i => st.allowed[i])
    if (st.isResponsible && t !== undefined) respType.set(s, t)
  })
  const slotOf = (s: number, d: number): Slot => ({ d, t: respType.get(s)! })

  const open: Array<{ d: number; cands: Set<number> }> = []
  for (let d = 0; d < ctx.D; d++) {
    if (state.hasResponsibleInZone(d, 'day')) continue
    open.push({ d, cands: new Set([...respType.keys()].filter(s => canPlace(state, s, slotOf(s, d)))) })
  }

  while (open.length > 0) {
    let bestIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].cands.size < open[bestIdx].cands.size) bestIdx = i
    }
    const { d, cands } = open.splice(bestIdx, 1)[0]
    if (cands.size === 0) continue
    const best = pickBest(state, cands, s => slotOf(s, d), rng)
    state.tryChanges(changesFor(state, best, slotOf(best, d))!)
    for (const o of open) {
      if (canPlace(state, best, slotOf(best, o.d))) o.cands.add(best)
      else o.cands.delete(best)
    }
  }
}

/**
 * 公休数から決まる目標勤務日数まで、日中帯の人数が均等になるように埋める。
 * 勤務区分は最低配置人数の比率で振り分ける（設定がなければ日中帯区分に均等）。
 */
function fillWorkDays(state: ScheduleState, rng: Rng): void {
  const { ctx } = state
  const stuck = new Set<number>()
  const anyRequired = ctx.dayTypes.some(t => ctx.required[t] > 0)
  const weight = (t: number) => (anyRequired ? ctx.required[t] : 1)
  const fillTypes = ctx.staff.map(st => {
    const allowed = ctx.dayTypes.filter(t => st.allowed[t])
    const weighted = allowed.filter(t => weight(t) > 0)
    return weighted.length > 0 ? weighted : allowed
  })
  // その日に入れる区分：人数 / 比率 が最も小さい区分（半人前職員は重複を避ける）
  const typeFor = (s: number, d: number): number => {
    let best = fillTypes[s][0]
    let bestScore = Infinity
    for (const t of fillTypes[s]) {
      let score = state.countOnDay(d, t) / Math.max(1, weight(t))
      if (ctx.rules.halfIsolation && ctx.staff[s].isHalf && state.halfCountOnDay(d, t) > 0) score += 1000
      if (score < bestScore) {
        bestScore = score
        best = t
      }
    }
    return best
  }

  for (;;) {
    let s = -1
    let bestNeed = 0
    let bestTie = 0
    for (let i = 0; i < ctx.staff.length; i++) {
      if (stuck.has(i) || fillTypes[i].length === 0) continue
      const need = ctx.staff[i].targetWork - state.workCount(i)
      const tie = rng()
      if (need > bestNeed || (need === bestNeed && need > 0 && tie > bestTie)) {
        s = i
        bestNeed = need
        bestTie = tie
      }
    }
    if (s < 0) return

    const days: Array<{ d: number; t: number; score: number }> = []
    for (let d = 0; d < ctx.D; d++) {
      if (!state.isFree(s, ctx.P + d)) continue
      const t = typeFor(s, d)
      let score = state.zoneCountOnDay(d, 'day') * 10
      if (ctx.weekendOrHoliday[d]) score += 4 * state.weekendCount(s)
      if (ctx.rules.minWeeklyOff !== null) {
        const week = ctx.weeks.find(([a, b]) => d >= a && d < b)
        if (week) {
          let work = 0
          for (let i = week[0]; i < week[1]; i++) if (state.cells[s][ctx.P + i] >= 0) work++
          if (7 - work <= ctx.rules.minWeeklyOff) score += 100
        }
      }
      if (ctx.rules.halfIsolation && ctx.staff[s].isHalf && state.halfCountOnDay(d, t) > 0) score += 50
      if (ctx.rules.requireRespDay && ctx.staff[s].isResponsible && !state.hasResponsibleInZone(d, 'day')) score -= 200
      days.push({ d, t, score: score + rng() * 3 })
    }
    days.sort((a, b) => a.score - b.score)

    let placed = false
    for (const { d, t } of days) {
      if (state.tryChanges([[s, ctx.P + d, t]])) {
        placed = true
        break
      }
    }
    if (!placed) stuck.add(s)
  }
}

function explainNoCandidate(state: ScheduleState, slot: Slot): string {
  const { ctx } = state
  const pos = ctx.P + slot.d
  let onLeave = 0
  let notEligible = 0
  let alreadyWorking = 0
  let blocked = 0
  ctx.staff.forEach((st, s) => {
    const cell = state.cells[s][pos]
    if (!st.allowed[slot.t]) notEligible++
    else if (cell === -2) onLeave++
    else if (cell >= 0) alreadyWorking++
    else blocked++
  })
  const parts: string[] = []
  if (onLeave) parts.push(`休暇${onLeave}名`)
  if (notEligible) parts.push(`対象外${notEligible}名`)
  if (alreadyWorking) parts.push(`他の勤務${alreadyWorking}名`)
  if (blocked) parts.push(`連勤・勤務日数・夜勤明けの制約${blocked}名`)
  return `配置できるスタッフがいません（${parts.join('・') || 'スタッフなし'}）`
}
