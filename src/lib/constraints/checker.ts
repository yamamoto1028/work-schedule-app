// 制約チェックロジック（エントリポイント）
// 各カテゴリの判定は category-*.ts、パラメータ解決は rules.ts に実装する。

import type { CheckContext, ConstraintConfig, ConstraintViolation, ShiftEntry } from './types'
import { getDatesInMonth, toEnabledMap } from './rules'
import { checkCategoryA } from './category-a-consecutive'
import { checkCategoryB } from './category-b-night'
import { checkCategoryC } from './category-c-staffing'
import { checkCategoryD } from './category-d-attribute'

export type { ShiftEntry, ConstraintViolation, ConstraintConfig } from './types'

export function checkConstraints(
  shifts: ShiftEntry[],
  constraints: ConstraintConfig[],
  year: number,
  month: number,
  shiftTypeNames?: Map<string, string>,
  holidays: string[] = []
): ConstraintViolation[] {
  // ユーザー別にシフトをグループ化
  const byUser = new Map<string, ShiftEntry[]>()
  for (const s of shifts) {
    if (!byUser.has(s.userId)) byUser.set(s.userId, [])
    byUser.get(s.userId)!.push(s)
  }

  const ctx: CheckContext = {
    shifts,
    byUser,
    dates: getDatesInMonth(year, month),
    year,
    month,
    enabled: toEnabledMap(constraints),
    holidays: new Set(holidays),
    shiftTypeNames,
  }

  return [
    ...checkCategoryD(ctx),
    ...checkCategoryA(ctx),
    ...checkCategoryC(ctx),
    ...checkCategoryB(ctx),
  ]
}
