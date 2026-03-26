// 制約チェックロジック

export type ShiftEntry = {
  userId: string
  date: string // YYYY-MM-DD
  shiftTypeId: string
  timeZone: 'day' | 'night'
  shortName: string
}

export type ConstraintViolation = {
  userId: string
  date: string
  message: string
  severity: 'error' | 'warning'
}

type ConstraintConfig = {
  constraint_key: string
  is_enabled: boolean
  value: Record<string, number>
}

// 日付をYYYY-MM-DD形式で加算
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// 月の全日付リスト
function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return dates
}

export function checkConstraints(
  shifts: ShiftEntry[],
  constraints: ConstraintConfig[],
  year: number,
  month: number
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []
  const enabledMap = new Map(constraints.map(c => [c.constraint_key, c]))

  // ユーザー別にシフトをグループ化
  const byUser = new Map<string, ShiftEntry[]>()
  for (const s of shifts) {
    if (!byUser.has(s.userId)) byUser.set(s.userId, [])
    byUser.get(s.userId)!.push(s)
  }

  const dates = getDatesInMonth(year, month)

  for (const [userId, userShifts] of byUser) {
    const shiftByDate = new Map(userShifts.map(s => [s.date, s]))

    // 夜勤明け翌日は休み
    const restAfterNight = enabledMap.get('rest_after_night_off')
    if (restAfterNight?.is_enabled) {
      for (const s of userShifts) {
        if (s.timeZone === 'night' && s.shortName === '明') {
          const nextDay = addDays(s.date, 1)
          if (shiftByDate.has(nextDay)) {
            violations.push({
              userId,
              date: nextDay,
              message: '夜勤明けの翌日は休みにしてください',
              severity: 'error',
            })
          }
        }
      }
    }

    // 夜間帯翌日の日中帯禁止
    const noDayAfterNight = enabledMap.get('no_day_shift_after_night')
    if (noDayAfterNight?.is_enabled) {
      for (const s of userShifts) {
        if (s.timeZone === 'night') {
          const nextDay = addDays(s.date, 1)
          const next = shiftByDate.get(nextDay)
          if (next && next.timeZone === 'day') {
            violations.push({
              userId,
              date: nextDay,
              message: '夜間帯勤務の翌日に日中帯シフトは配置できません',
              severity: 'error',
            })
          }
        }
      }
    }

    // 連勤上限チェック
    const maxConsec = enabledMap.get('max_consecutive_days')
    const maxDays = maxConsec?.is_enabled ? (maxConsec.value?.days ?? 5) : 5

    let consecCount = 0
    let consecStart = ''
    for (const date of dates) {
      if (shiftByDate.has(date)) {
        if (consecCount === 0) consecStart = date
        consecCount++
        if (consecCount > maxDays) {
          violations.push({
            userId,
            date,
            message: `連続勤務${consecCount}日目（上限${maxDays}日）`,
            severity: 'warning',
          })
        }
      } else {
        consecCount = 0
      }
    }

    // 月間勤務数上限
    const maxMonthly = enabledMap.get('max_monthly_shifts')
    if (maxMonthly?.is_enabled) {
      const limit = maxMonthly.value?.shifts ?? 22
      const count = userShifts.length
      if (count > limit) {
        violations.push({
          userId,
          date: dates[dates.length - 1],
          message: `月間勤務数${count}日（上限${limit}日）`,
          severity: 'warning',
        })
      }
    }
  }

  return violations
}
