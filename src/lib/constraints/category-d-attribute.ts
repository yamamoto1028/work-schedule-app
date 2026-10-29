// カテゴリ D：スタッフ属性別制約

import type { CheckContext, ConstraintViolation, ShiftEntry } from './types'
import { isHalfGrade, isWeekendOrHoliday } from './rules'

export function checkCategoryD(ctx: CheckContext): ConstraintViolation[] {
  const { enabled, shifts, shiftTypeNames } = ctx
  const violations: ConstraintViolation[] = []

  // スタッフごとの許可シフト（制約設定に関わらず常にチェック）
  for (const s of shifts) {
    const allowed = s.allowedShiftTypeIds
    if (allowed && allowed.length > 0 && !allowed.includes(s.shiftTypeId)) {
      const typeName = shiftTypeNames?.get(s.shiftTypeId) ?? s.shortName
      violations.push({
        userId: s.userId,
        date: s.date,
        message: `「${typeName}」はこのスタッフに許可されていないシフトです`,
        severity: 'error',
      })
    }
  }

  // 土日祝休み固定のスタッフ（制約設定に関わらず常にチェック）
  for (const s of shifts) {
    if (s.weekendsHolidaysOff && isWeekendOrHoliday(s.date, ctx.holidays)) {
      violations.push({
        userId: s.userId,
        date: s.date,
        message: '土日祝休みのスタッフです',
        severity: 'error',
      })
    }
  }

  // 半人前職員（half / new）を同一シフトに複数配置しない
  if (enabled.has('half_staff_isolation')) {
    const halfByDateType = new Map<string, ShiftEntry[]>()
    for (const s of shifts) {
      if (!isHalfGrade(s.staffGrade)) continue
      const key = `${s.date}__${s.shiftTypeId}`
      const list = halfByDateType.get(key) ?? []
      list.push(s)
      halfByDateType.set(key, list)
    }
    for (const list of halfByDateType.values()) {
      if (list.length < 2) continue
      const typeName = shiftTypeNames?.get(list[0].shiftTypeId) ?? list[0].shortName
      violations.push({
        userId: list[1].userId,
        date: list[1].date,
        message: `「${typeName}」に半人前職員が${list.length}名配置されています`,
        severity: 'warning',
      })
    }
  }

  return violations
}
