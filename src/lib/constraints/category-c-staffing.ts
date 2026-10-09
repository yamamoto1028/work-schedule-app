// カテゴリ C：シフト人数・構成ルール

import type { CheckContext, ConstraintViolation } from './types'
import { isResponsibleRoleName, resolveStaffMinimums } from './rules'

export function checkCategoryC(ctx: CheckContext): ConstraintViolation[] {
  const { enabled, dates, shifts, shiftTypeNames } = ctx
  const violations: ConstraintViolation[] = []
  const datesWithShifts = new Set(shifts.map(s => s.date))

  // 日中帯・夜間帯の責任者配置チェック（日付単位、シフト配置がある日付のみ）
  const requireDay = enabled.has('require_responsible_day_zone')
  const requireNight = enabled.has('require_responsible_night_zone')
  if (requireDay || requireNight) {
    const zones: Array<{ zone: 'day' | 'night'; label: string }> = []
    if (requireDay) zones.push({ zone: 'day', label: '日中帯' })
    if (requireNight) zones.push({ zone: 'night', label: '夜間帯' })

    for (const date of dates) {
      if (!datesWithShifts.has(date)) continue
      for (const { zone, label } of zones) {
        const inZone = shifts.filter(s => s.date === date && s.timeZone === zone)
        if (inZone.length > 0 && !inZone.some(s => isResponsibleRoleName(s.responsibleRoleName))) {
          // 当該時間帯の最初のスタッフにviolationを紐付け
          violations.push({
            userId: inZone[0].userId,
            date,
            message: `${label}に責任者（主任・副主任・夜勤責任者）が配置されていません`,
            severity: 'error',
          })
        }
      }
    }
  }

  // シフト種別ごとの1日最低人数チェック
  const minimums = resolveStaffMinimums(enabled)
  if (minimums.size > 0) {
    const countByDateType = new Map<string, number>()
    for (const s of shifts) {
      const key = `${s.date}__${s.shiftTypeId}`
      countByDateType.set(key, (countByDateType.get(key) ?? 0) + 1)
    }
    for (const date of dates) {
      if (!datesWithShifts.has(date)) continue
      for (const [shiftTypeId, minCount] of minimums) {
        const actual = countByDateType.get(`${date}__${shiftTypeId}`) ?? 0
        if (actual < minCount) {
          const typeName = shiftTypeNames?.get(shiftTypeId) ?? shiftTypeId
          const firstOnDate = shifts.find(s => s.date === date)
          violations.push({
            userId: firstOnDate?.userId ?? '',
            date,
            message: `「${typeName}」の配置が${actual}名（最低${minCount}名必要）`,
            severity: 'error',
          })
        }
      }
    }
  }

  return violations
}
