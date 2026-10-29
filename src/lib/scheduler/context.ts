// 入力の前処理とシフト表の状態管理（ハード制約の判定を含む）

import type { ConstraintConfig } from '@/lib/constraints/types'
import {
  addDays,
  fullWeeksInMonth,
  getDatesInMonth,
  isAkeShiftType,
  isHalfGrade,
  isWeekendOrHoliday,
  isResponsibleRoleName,
  resolveConsecutiveLimit,
  resolveMaxMonthlyShifts,
  resolveMaxNightShifts,
  resolveMinWeeklyDaysOff,
  resolveNightInterval,
  resolveStaffMinimums,
  toEnabledMap,
  type NightIntervalRule,
} from '@/lib/constraints/rules'
import type { SchedulerInput, SchedulerStaff } from './types'

export const EMPTY = -1
export const LEAVE = -2
// 前月末から引き継いで判定する日数（連勤・明け・休みの判定に使う）
export const PREFIX_DAYS = 7

export type TypeInfo = {
  id: string
  name: string
  shortName: string
  isNight: boolean
  isAke: boolean
  isDay: boolean
}

export type StaffInfo = SchedulerStaff & {
  allowed: boolean[] // 勤務区分インデックスごとの可否（夜勤可否も反映済み）
  isResponsible: boolean
  // 日中帯の責任者として確保するスタッフ（夜勤は他で回せないときだけ入れ、均等配分の対象外）
  reservedForDay: boolean
  isHalf: boolean
  targetWork: number // 目標勤務日数 = 上限
  maxNight: number | null
}

export type Rules = {
  restAfterAke: boolean
  noDayAfterNight: boolean
  consecLimitNight: number | null
  consecLimitDay: number | null
  minWeeklyOff: number | null
  halfIsolation: boolean
  equalNight: boolean
  requireRespDay: boolean
  requireRespNight: boolean
  interval: NightIntervalRule | null
}

export type Context = {
  dates: string[]
  D: number
  P: number
  types: TypeInfo[]
  akeType: number // 明けの勤務区分インデックス（なければ -1）
  nightTypes: number[] // 明け以外の夜間帯区分
  dayTypes: number[] // 日中帯区分（sort_order 順）
  staff: StaffInfo[]
  rules: Rules
  required: number[] // 勤務区分ごとの1日最低人数（明けは 0）
  weekendOrHoliday: boolean[]
  weeks: Array<[number, number]>
  intervalWindows: Array<[number, number]>
}

export function buildContext(input: SchedulerInput): Context {
  const dates = getDatesInMonth(input.year, input.month)
  const D = dates.length
  const P = PREFIX_DAYS
  const enabled = toEnabledMap(input.constraints as ConstraintConfig[])

  const types: TypeInfo[] = input.shiftTypes.map(t => {
    const isNight = t.timeZone === 'night'
    return {
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      isNight,
      isAke: isNight && isAkeShiftType(t),
      isDay: !isNight,
    }
  })
  // 無効化された区分など、マスタにない既存シフト用の擬似区分（勤務日として扱う）
  types.push({ id: '__unknown__', name: '', shortName: '', isNight: false, isAke: false, isDay: true })
  const unknownType = types.length - 1

  const akeType = types.findIndex(t => t.isAke)
  const nightTypes = types.map((t, i) => (t.isNight && !t.isAke ? i : -1)).filter(i => i >= 0)
  const dayTypes = types.map((t, i) => (t.isDay && i !== unknownType ? i : -1)).filter(i => i >= 0)

  const rules: Rules = {
    restAfterAke: enabled.has('rest_after_night_off'),
    noDayAfterNight: enabled.has('no_day_shift_after_night'),
    consecLimitNight: resolveConsecutiveLimit(enabled, true),
    consecLimitDay: resolveConsecutiveLimit(enabled, false),
    minWeeklyOff: resolveMinWeeklyDaysOff(enabled),
    halfIsolation: enabled.has('half_staff_isolation'),
    equalNight: enabled.has('night_shift_equal_distribution'),
    requireRespDay: enabled.has('require_responsible_day_zone'),
    requireRespNight: enabled.has('require_responsible_night_zone'),
    interval: resolveNightInterval(enabled),
  }

  // 休暇の集計（公休に含む休み / 含まない休み）
  const leaveDates = new Map<string, Map<string, boolean>>()
  for (const l of input.leaves) {
    if (!leaveDates.has(l.userId)) leaveDates.set(l.userId, new Map())
    leaveDates.get(l.userId)!.set(l.date, l.countsAsDayOff)
  }

  const holidaySet = new Set(input.holidays)
  const weekendOrHoliday = dates.map(d => isWeekendOrHoliday(d, holidaySet))

  const facilityMaxNight = resolveMaxNightShifts(enabled)
  const staff: StaffInfo[] = input.staff.map(s => {
    const allowed = types.map((t, i) => {
      if (i === unknownType) return true
      if (t.isNight && !s.canNightShift) return false
      return s.allowedShiftTypeIds.length === 0 || s.allowedShiftTypeIds.includes(t.id)
    })
    const leaves = [...(leaveDates.get(s.id)?.entries() ?? [])].filter(([d]) => dates.includes(d))
    const wishOff = leaves.filter(([, counts]) => counts).length
    const otherOff = leaves.length - wishOff
    // 公休数は固定。希望休は公休に含め、有給などは公休とは別に休む。
    // 土日祝休み固定のスタッフは、休暇のない平日がすべて勤務日（公休数は使わない）
    const leaveSet = new Set(leaves.map(([d]) => d))
    let targetWork = s.weekendsHolidaysOff
      ? dates.filter((d, i) => !weekendOrHoliday[i] && !leaveSet.has(d)).length
      : Math.max(0, D - Math.max(input.daysOff, wishOff) - otherOff)
    const cap = resolveMaxMonthlyShifts(enabled, s.maxMonthlyShifts)
    if (cap !== null) targetWork = Math.min(targetWork, cap)

    let maxNight = facilityMaxNight
    if (s.fixedNightCount != null) {
      maxNight = maxNight === null ? s.fixedNightCount : Math.min(maxNight, s.fixedNightCount)
    }
    return {
      ...s,
      allowed,
      isResponsible: isResponsibleRoleName(s.responsibleRoleName),
      reservedForDay: rules.requireRespDay && !rules.requireRespNight && isResponsibleRoleName(s.responsibleRoleName),
      isHalf: isHalfGrade(s.staffGrade),
      targetWork,
      maxNight,
    }
  })

  // 1日の最低配置人数。夜間帯は設定がなくても最低1名を確保する
  const minimums = resolveStaffMinimums(enabled)
  const required = types.map(t => (t.isAke ? 0 : minimums.get(t.id) ?? 0))
  if (!nightTypes.some(i => required[i] > 0) && nightTypes.length > 0) {
    const primary = nightTypes.find(i => staff.some(s => s.allowed[i])) ?? nightTypes[0]
    required[primary] = 1
  }

  const intervalWindows: Array<[number, number]> = []
  if (rules.interval) {
    const { intervalDays, startDay } = rules.interval
    for (let i = Math.max(0, startDay - 1); i < D; i += intervalDays) {
      intervalWindows.push([i, Math.min(D, i + intervalDays)])
    }
  }

  return {
    dates,
    D,
    P,
    types,
    akeType,
    nightTypes,
    dayTypes,
    staff,
    rules,
    required,
    weekendOrHoliday,
    weeks: fullWeeksInMonth(dates),
    intervalWindows,
  }
}

/** シフト表の状態。cells[s] は前月末 P 日 + 当月 D 日の勤務区分インデックス */
export class ScheduleState {
  readonly ctx: Context
  readonly cells: Int16Array[]
  readonly locked: Uint8Array[] // 1 = 変更不可（前月分・既存シフト・休暇）

  constructor(ctx: Context, input: SchedulerInput) {
    this.ctx = ctx
    const len = ctx.P + ctx.D
    this.cells = ctx.staff.map(() => new Int16Array(len).fill(EMPTY))
    this.locked = ctx.staff.map(() => new Uint8Array(len))

    const staffIndex = new Map(ctx.staff.map((s, i) => [s.id, i]))
    const typeIndex = new Map(ctx.types.map((t, i) => [t.id, i]))
    const unknownType = ctx.types.length - 1
    const posOf = (date: string): number => {
      const inMonth = ctx.dates.indexOf(date)
      if (inMonth >= 0) return ctx.P + inMonth
      for (let k = 1; k <= ctx.P; k++) {
        if (addDays(ctx.dates[0], -k) === date) return ctx.P - k
      }
      return -1
    }

    for (let s = 0; s < ctx.staff.length; s++) this.locked[s].fill(1, 0, ctx.P)

    for (const l of input.leaves) {
      const s = staffIndex.get(l.userId)
      const pos = posOf(l.date)
      if (s === undefined || pos < ctx.P) continue
      this.cells[s][pos] = LEAVE
      this.locked[s][pos] = 1
    }
    // 既存シフトは休暇より優先して固定する
    for (const a of [...input.previousShifts, ...input.fixedShifts]) {
      const s = staffIndex.get(a.userId)
      const pos = posOf(a.date)
      if (s === undefined || pos < 0) continue
      this.cells[s][pos] = typeIndex.get(a.shiftTypeId) ?? unknownType
      this.locked[s][pos] = 1
    }
  }

  clone(): Int16Array[] {
    return this.cells.map(row => row.slice())
  }

  restore(snapshot: Int16Array[]): void {
    snapshot.forEach((row, s) => this.cells[s].set(row))
  }

  isFree(s: number, pos: number): boolean {
    return this.cells[s][pos] === EMPTY && this.locked[s][pos] === 0
  }

  /**
   * スタッフ1人分のハード制約違反量。
   * 既存シフトに元々ある違反を含むため、配置の可否は「配置前より増えないか」で判定する。
   */
  hardCost(s: number): number {
    const { ctx } = this
    const { P, D, types, rules, akeType } = ctx
    const row = this.cells[s]
    const st = ctx.staff[s]
    let cost = 0
    let work = 0
    let nights = 0
    let worksNight = false

    for (let i = P; i < P + D; i++) {
      const t = row[i]
      if (t < 0) continue
      work++
      if (types[t].isNight) {
        worksNight = true
        if (!types[t].isAke) nights++
      }
      if (!st.allowed[t]) cost++
      if (st.weekendsHolidaysOff && ctx.weekendOrHoliday[i - P]) cost++
    }

    for (let i = P - 1; i < P + D - 1; i++) {
      const a = row[i]
      const b = row[i + 1]
      if (a >= 0 && b >= 0) {
        if (rules.restAfterAke && types[a].isAke) cost++
        if (rules.noDayAfterNight && types[a].isNight && types[b].isDay) cost++
      }
      if (akeType >= 0) {
        const aIsNightEntry = a >= 0 && types[a].isNight && !types[a].isAke
        // 夜勤の翌日は明け、明けの前日は夜勤
        if (aIsNightEntry && b !== akeType) cost++
        if (b >= 0 && types[b].isAke && !aIsNightEntry) cost++
      }
    }

    // 土日祝休み固定のスタッフは連勤上限なし（平日の連続勤務は土日祝で必ず区切られる）
    const limit = st.weekendsHolidaysOff ? null : worksNight ? rules.consecLimitNight : rules.consecLimitDay
    if (limit !== null) {
      let run = 0
      for (let i = 0; i < P + D; i++) {
        if (row[i] >= 0) {
          run++
          if (i >= P && run > limit) cost++
        } else {
          run = 0
        }
      }
    }

    cost += Math.max(0, work - st.targetWork)
    if (st.maxNight !== null) cost += Math.max(0, nights - st.maxNight)
    return cost
  }

  /** 変更を適用し、ハード制約違反が増えるなら元に戻して false を返す */
  tryChanges(changes: Array<[s: number, pos: number, type: number]>): boolean {
    const touched = [...new Set(changes.map(c => c[0]))]
    const before = touched.map(s => this.hardCost(s))
    const prev = changes.map(([s, pos]) => this.cells[s][pos])
    for (const [s, pos, t] of changes) this.cells[s][pos] = t
    const ok = touched.every((s, i) => this.hardCost(s) <= before[i])
    if (!ok) {
      for (let i = changes.length - 1; i >= 0; i--) {
        const [s, pos] = changes[i]
        this.cells[s][pos] = prev[i]
      }
    }
    return ok
  }

  /** 夜勤（+ 翌日の明け）をまとめて配置する変更リスト。空きセルでなければ null */
  nightBlock(s: number, d: number, t: number): Array<[number, number, number]> | null {
    const { P, D, akeType } = this.ctx
    const changes: Array<[number, number, number]> = [[s, P + d, t]]
    if (akeType >= 0 && d + 1 < D) changes.push([s, P + d + 1, akeType])
    return changes.every(([ss, pos]) => this.isFree(ss, pos)) ? changes : null
  }

  // ---- 集計ヘルパー ----

  workCount(s: number): number {
    const { P, D } = this.ctx
    let n = 0
    for (let i = P; i < P + D; i++) if (this.cells[s][i] >= 0) n++
    return n
  }

  nightCount(s: number): number {
    const { P, D, types } = this.ctx
    let n = 0
    for (let i = P; i < P + D; i++) {
      const t = this.cells[s][i]
      if (t >= 0 && types[t].isNight && !types[t].isAke) n++
    }
    return n
  }

  weekendCount(s: number): number {
    const { P, D, weekendOrHoliday } = this.ctx
    let n = 0
    for (let d = 0; d < D; d++) if (weekendOrHoliday[d] && this.cells[s][P + d] >= 0) n++
    return n
  }

  countOnDay(d: number, t: number): number {
    const pos = this.ctx.P + d
    let n = 0
    for (const row of this.cells) if (row[pos] === t) n++
    return n
  }

  halfCountOnDay(d: number, t: number): number {
    const pos = this.ctx.P + d
    let n = 0
    this.cells.forEach((row, s) => {
      if (row[pos] === t && this.ctx.staff[s].isHalf) n++
    })
    return n
  }

  zoneCountOnDay(d: number, zone: 'day' | 'night'): number {
    const { P, types } = this.ctx
    let n = 0
    for (const row of this.cells) {
      const t = row[P + d]
      if (t < 0) continue
      if (zone === 'day' ? types[t].isDay : types[t].isNight && !types[t].isAke) n++
    }
    return n
  }

  hasResponsibleInZone(d: number, zone: 'day' | 'night'): boolean {
    const { P, types, staff } = this.ctx
    return this.cells.some((row, s) => {
      const t = row[P + d]
      if (t < 0 || !staff[s].isResponsible) return false
      return zone === 'day' ? types[t].isDay : types[t].isNight
    })
  }

  hasRoleNightInWindow(start: number, end: number, roleName: string): boolean {
    const { P, types, staff } = this.ctx
    for (let s = 0; s < staff.length; s++) {
      if (staff[s].responsibleRoleName !== roleName) continue
      for (let d = start; d < end; d++) {
        const t = this.cells[s][P + d]
        if (t >= 0 && types[t].isNight) return true
      }
    }
    return false
  }

  maxConsecutive(s: number): number {
    const { P, D } = this.ctx
    let run = 0
    let best = 0
    for (let i = 0; i < P + D; i++) {
      if (this.cells[s][i] >= 0) {
        run++
        if (i >= P) best = Math.max(best, run)
      } else {
        run = 0
      }
    }
    return best
  }
}
