// 制約パラメータの解決ロジック
// 制約チェッカー（lib/constraints）とシフト自動作成（lib/scheduler）で共有し、
// 「生成したシフトをチェッカーが違反扱いする」ズレが起きないようにする。

import type { ConstraintConfig, StaffGrade } from './types'

export const DEFAULT_MONTHLY_DAYS_OFF = 8

const RESPONSIBLE_ROLE_NAMES = new Set(['主任', '副主任', '夜勤責任者'])

export function isResponsibleRoleName(name: string | null | undefined): boolean {
  return !!name && RESPONSIBLE_ROLE_NAMES.has(name)
}

// 「明け」判定（DB にフラグがないため名前ベースのヒューリスティック）
export function isAkeShiftType(st: { shortName: string; name?: string }): boolean {
  return st.shortName.includes('明') || (st.name ?? '').includes('明け')
}

export function isHalfGrade(grade: StaffGrade | undefined): boolean {
  return grade === 'half' || grade === 'new'
}

export function toEnabledMap(constraints: ConstraintConfig[]): Map<string, ConstraintConfig> {
  return new Map(constraints.filter(c => c.is_enabled).map(c => [c.constraint_key, c]))
}

function numberValue(cfg: ConstraintConfig | undefined, key: string, fallback: number): number {
  const v = cfg?.value?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/**
 * 連勤上限（夜勤明け含む連続勤務日数）。
 * 夜勤ありスタッフは max_consecutive_with_night、日中帯のみスタッフは max_consecutive_day_only を優先し、
 * どちらも無効なら全スタッフ共通の max_consecutive_days を使う。すべて無効なら null（上限なし）。
 */
export function resolveConsecutiveLimit(
  enabled: Map<string, ConstraintConfig>,
  worksNight: boolean,
): number | null {
  const specific = enabled.get(worksNight ? 'max_consecutive_with_night' : 'max_consecutive_day_only')
  if (specific) return numberValue(specific, 'days', worksNight ? 4 : 3)
  const common = enabled.get('max_consecutive_days')
  if (common) return numberValue(common, 'days', 5)
  return null
}

/**
 * 月の公休数。min_days_off_per_month の value に
 * `{ days: 基本値, monthly: { "YYYY-MM": 月別値 } }` の形で保存する。
 * 有効/無効に関わらず値を返す（シフト自動作成は常に公休数を必要とするため）。
 */
export function resolveMonthlyDaysOff(cfg: ConstraintConfig | undefined, yearMonth: string): number {
  const monthly = cfg?.value?.monthly
  if (monthly && typeof monthly === 'object') {
    const v = (monthly as Record<string, unknown>)[yearMonth]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return numberValue(cfg, 'days', DEFAULT_MONTHLY_DAYS_OFF)
}

/** 月最大勤務数。スタッフ個人設定 > 施設共通設定（有効時のみ）。null = 上限なし */
export function resolveMaxMonthlyShifts(
  enabled: Map<string, ConstraintConfig>,
  personal: number | null | undefined,
): number | null {
  if (personal != null && personal > 0) return personal
  const cfg = enabled.get('max_monthly_shifts')
  return cfg ? numberValue(cfg, 'shifts', 22) : null
}

/** 月あたりの夜勤上限（明けは数えない）。null = 上限なし */
export function resolveMaxNightShifts(enabled: Map<string, ConstraintConfig>): number | null {
  const cfg = enabled.get('max_night_shifts_per_month')
  return cfg ? numberValue(cfg, 'count', 8) : null
}

/** 週あたり最低休日数。null = チェックなし */
export function resolveMinWeeklyDaysOff(enabled: Map<string, ConstraintConfig>): number | null {
  const cfg = enabled.get('min_weekly_days_off')
  return cfg ? numberValue(cfg, 'days', 2) : null
}

/** 勤務区分ID → 1日の最低配置人数（0 は除外） */
export function resolveStaffMinimums(enabled: Map<string, ConstraintConfig>): Map<string, number> {
  const cfg = enabled.get('min_staff_per_shift_type')
  const result = new Map<string, number>()
  if (!cfg?.value) return result
  for (const [typeId, v] of Object.entries(cfg.value)) {
    if (typeof v === 'number' && v > 0) result.set(typeId, v)
  }
  return result
}

export type NightIntervalRule = { intervalDays: number; startDay: number; roleName: string }

export function resolveNightInterval(enabled: Map<string, ConstraintConfig>): NightIntervalRule | null {
  const cfg = enabled.get('night_shift_responsible_interval')
  if (!cfg) return null
  const roleName = cfg.value?.responsible_role_name
  const intervalDays = numberValue(cfg, 'interval_days', 7)
  if (typeof roleName !== 'string' || !roleName || intervalDays <= 0) return null
  return { intervalDays, startDay: numberValue(cfg, 'start_day', 1), roleName }
}

// ---- 日付ユーティリティ（タイムゾーンに依存しないよう UTC で計算） ----

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = []
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return dates
}

/** 0 = 日曜 … 6 = 土曜 */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function isWeekendOrHoliday(dateStr: string, holidays: Set<string>): boolean {
  const dow = dayOfWeek(dateStr)
  return dow === 0 || dow === 6 || holidays.has(dateStr)
}

/** 月内に完全に収まる週（月曜〜日曜）の日付インデックス範囲 [start, end) */
export function fullWeeksInMonth(dates: string[]): Array<[number, number]> {
  const weeks: Array<[number, number]> = []
  for (let i = 0; i + 7 <= dates.length; i++) {
    if (dayOfWeek(dates[i]) === 1) {
      weeks.push([i, i + 7])
      i += 6
    }
  }
  return weeks
}
