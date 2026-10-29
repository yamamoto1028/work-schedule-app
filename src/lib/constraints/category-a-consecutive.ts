// カテゴリ A：連勤・休日ルール

import type { CheckContext, ConstraintViolation } from './types'
import {
  addDays,
  fullWeeksInMonth,
  isAkeShiftType,
  resolveConsecutiveLimit,
  resolveMaxMonthlyShifts,
  resolveMinWeeklyDaysOff,
  resolveMonthlyDaysOff,
} from './rules'

export function checkCategoryA(ctx: CheckContext): ConstraintViolation[] {
  const { enabled, dates } = ctx
  const violations: ConstraintViolation[] = []
  const yearMonth = `${ctx.year}-${String(ctx.month).padStart(2, '0')}`

  for (const [userId, userShifts] of ctx.byUser) {
    const shiftByDate = new Map(userShifts.map(s => [s.date, s]))

    // 夜勤明け翌日は休み
    if (enabled.has('rest_after_night_off')) {
      for (const s of userShifts) {
        if (s.timeZone === 'night' && isAkeShiftType({ shortName: s.shortName, name: s.shiftTypeName })) {
          const nextDay = addDays(s.date, 1)
          if (shiftByDate.has(nextDay)) {
            violations.push({ userId, date: nextDay, message: '夜勤明けの翌日は休みにしてください', severity: 'error' })
          }
        }
      }
    }

    // 夜間帯翌日の日中帯禁止
    if (enabled.has('no_day_shift_after_night')) {
      for (const s of userShifts) {
        if (s.timeZone === 'night') {
          const nextDay = addDays(s.date, 1)
          const next = shiftByDate.get(nextDay)
          if (next && next.timeZone === 'day') {
            violations.push({ userId, date: nextDay, message: '夜間帯勤務の翌日に日中帯シフトは配置できません', severity: 'error' })
          }
        }
      }
    }

    // 土日祝休み固定のスタッフは連勤上限・公休数の対象外（休みは土日祝で決まる）
    const weekendsHolidaysOff = userShifts.some(s => s.weekendsHolidaysOff)

    // 連勤上限（夜勤ありスタッフ / 日中帯のみスタッフ / 全スタッフ共通）
    const worksNight = userShifts.some(s => s.timeZone === 'night')
    const maxDays = weekendsHolidaysOff ? null : resolveConsecutiveLimit(enabled, worksNight)
    if (maxDays !== null) {
      let consecCount = 0
      for (const date of dates) {
        if (shiftByDate.has(date)) {
          consecCount++
          if (consecCount > maxDays) {
            violations.push({ userId, date, message: `連続勤務${consecCount}日目（上限${maxDays}日）`, severity: 'warning' })
          }
        } else {
          consecCount = 0
        }
      }
    }

    // 月の公休数（休日数が公休数を下回っていないか）
    const daysOffCfg = enabled.get('min_days_off_per_month')
    if (daysOffCfg && !weekendsHolidaysOff) {
      const required = resolveMonthlyDaysOff(daysOffCfg, yearMonth)
      const offDays = dates.length - shiftByDate.size
      if (offDays < required) {
        violations.push({
          userId,
          date: dates[dates.length - 1],
          message: `休日${offDays}日（公休${required}日に不足）`,
          severity: 'warning',
        })
      }
    }

    // 週あたり最低休日数（月内に収まる月〜日の週のみ判定）
    const minWeekly = resolveMinWeeklyDaysOff(enabled)
    if (minWeekly !== null) {
      for (const [start, end] of fullWeeksInMonth(dates)) {
        const work = dates.slice(start, end).filter(d => shiftByDate.has(d)).length
        const off = 7 - work
        if (off < minWeekly) {
          violations.push({
            userId,
            date: dates[end - 1],
            message: `週の休日${off}日（最低${minWeekly}日）`,
            severity: 'warning',
          })
        }
      }
    }

    // 月間勤務数上限（スタッフ個人設定を優先）
    const limit = resolveMaxMonthlyShifts(enabled, userShifts[0]?.maxMonthlyShifts)
    if (limit !== null && shiftByDate.size > limit) {
      violations.push({
        userId,
        date: dates[dates.length - 1],
        message: `月間勤務数${shiftByDate.size}日（上限${limit}日）`,
        severity: 'warning',
      })
    }
  }

  return violations
}
