// カテゴリ B：夜勤回数・配置ルール

import type { CheckContext, ConstraintViolation } from './types'
import { isAkeShiftType, resolveMaxNightShifts, resolveNightInterval } from './rules'

export function checkCategoryB(ctx: CheckContext): ConstraintViolation[] {
  const { enabled, dates, shifts } = ctx
  const violations: ConstraintViolation[] = []

  // 月あたりの夜勤上限（明けは数えない）
  const maxNight = resolveMaxNightShifts(enabled)
  if (maxNight !== null) {
    for (const [userId, userShifts] of ctx.byUser) {
      const nights = userShifts.filter(
        s => s.timeZone === 'night' && !isAkeShiftType({ shortName: s.shortName, name: s.shiftTypeName }),
      )
      if (nights.length > maxNight) {
        violations.push({
          userId,
          date: nights[nights.length - 1].date,
          message: `夜勤${nights.length}回（上限${maxNight}回）`,
          severity: 'warning',
        })
      }
    }
  }

  // N日ごとに指定責任者区分の夜勤配置チェック
  const interval = resolveNightInterval(enabled)
  if (interval) {
    const { intervalDays, startDay, roleName } = interval
    // startDay（1始まり）に対応するdates配列のオフセットを求める
    const startOffset = Math.max(0, startDay - 1)
    for (let i = startOffset; i < dates.length; i += intervalDays) {
      const windowDates = dates.slice(i, i + intervalDays)
      const hasResponsibleNight = shifts.some(
        s => windowDates.includes(s.date) && s.timeZone === 'night' && s.responsibleRoleName === roleName,
      )
      if (!hasResponsibleNight) {
        // 夜勤シフトがある日に紐付ける（なければウィンドウ末日）
        const nightInWindow = shifts.find(s => windowDates.includes(s.date) && s.timeZone === 'night')
        violations.push({
          userId: nightInWindow?.userId ?? shifts[0]?.userId ?? '',
          date: nightInWindow?.date ?? windowDates[windowDates.length - 1],
          message: `${intervalDays}日間に「${roleName}」の夜勤配置がありません`,
          severity: 'error',
        })
      }
    }
  }

  return violations
}
