// 制約チェックロジック

export type ShiftEntry = {
  userId: string
  date: string // YYYY-MM-DD
  shiftTypeId: string
  timeZone: 'day' | 'night'
  shortName: string
  responsibleRoleName?: string | null
  allowedShiftTypeIds?: string[] // 空 or undefined = 制限なし
}

const RESPONSIBLE_ROLE_NAMES = new Set(['主任', '副主任', '夜勤責任者'])

export type ConstraintViolation = {
  userId: string
  date: string
  message: string
  severity: 'error' | 'warning'
}

type ConstraintConfig = {
  constraint_key: string
  is_enabled: boolean
  value: Record<string, unknown>
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
  month: number,
  shiftTypeNames?: Map<string, string>
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

  // スタッフごとの許可シフト制約チェック（ユーザー横断）
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
    const maxDays = maxConsec?.is_enabled ? ((maxConsec.value?.days as number) ?? 5) : 5

    let consecCount = 0
    for (const date of dates) {
      if (shiftByDate.has(date)) {
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
      const limit = (maxMonthly.value?.shifts as number) ?? 22
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

  // 日中帯・夜間帯の責任者配置チェック（日付単位）
  const requireDay = enabledMap.get('require_responsible_day_zone')
  const requireNight = enabledMap.get('require_responsible_night_zone')
  if (requireDay?.is_enabled || requireNight?.is_enabled) {
    // 日付×時間帯ごとに責任者がいるか確認
    const byDateZone = new Map<string, boolean>() // key: `${date}_day` or `${date}_night`
    for (const s of shifts) {
      const key = `${s.date}_${s.timeZone}`
      if (!byDateZone.has(key)) byDateZone.set(key, false)
      if (s.responsibleRoleName && RESPONSIBLE_ROLE_NAMES.has(s.responsibleRoleName)) {
        byDateZone.set(key, true)
      }
    }

    // シフト配置がある日付のみチェック
    const datesWithShifts = new Set(shifts.map(s => s.date))
    for (const date of dates) {
      if (!datesWithShifts.has(date)) continue

      if (requireDay?.is_enabled) {
        const hasDayShifts = shifts.some(s => s.date === date && s.timeZone === 'day')
        if (hasDayShifts && !byDateZone.get(`${date}_day`)) {
          // 日中帯の最初のスタッフにviolationを紐付け
          const firstDayUser = shifts.find(s => s.date === date && s.timeZone === 'day')
          if (firstDayUser) {
            violations.push({
              userId: firstDayUser.userId,
              date,
              message: '日中帯に責任者（主任・副主任・夜勤責任者）が配置されていません',
              severity: 'error',
            })
          }
        }
      }

      if (requireNight?.is_enabled) {
        const hasNightShifts = shifts.some(s => s.date === date && s.timeZone === 'night')
        if (hasNightShifts && !byDateZone.get(`${date}_night`)) {
          const firstNightUser = shifts.find(s => s.date === date && s.timeZone === 'night')
          if (firstNightUser) {
            violations.push({
              userId: firstNightUser.userId,
              date,
              message: '夜間帯に責任者（主任・副主任・夜勤責任者）が配置されていません',
              severity: 'error',
            })
          }
        }
      }
    }
  }

  // N日ごとに指定責任者区分の夜勤配置チェック
  const nightInterval = enabledMap.get('night_shift_responsible_interval')
  if (nightInterval?.is_enabled) {
    const intervalDays = (nightInterval.value?.interval_days as number) ?? 7
    const startDay = (nightInterval.value?.start_day as number) ?? 1
    const roleName = nightInterval.value?.responsible_role_name as string | undefined
    if (roleName && intervalDays > 0) {
      // startDay（1始まり）に対応するdates配列のオフセットを求める
      const startOffset = Math.max(0, startDay - 1)
      for (let i = startOffset; i < dates.length; i += intervalDays) {
        const windowDates = dates.slice(i, i + intervalDays)
        const hasResponsibleNight = shifts.some(
          s => windowDates.includes(s.date) && s.timeZone === 'night' && s.responsibleRoleName === roleName
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
  }

  // シフト種別ごとの1日最低人数チェック
  const minPerShift = enabledMap.get('min_staff_per_shift_type')
  if (minPerShift?.is_enabled && minPerShift.value) {
    const minimums = minPerShift.value as Record<string, number>
    // 日付ごと × shiftTypeId ごとに配置人数を集計
    const countByDateType = new Map<string, number>()
    for (const s of shifts) {
      const key = `${s.date}__${s.shiftTypeId}`
      countByDateType.set(key, (countByDateType.get(key) ?? 0) + 1)
    }
    const datesWithShifts = new Set(shifts.map(s => s.date))
    for (const date of dates) {
      if (!datesWithShifts.has(date)) continue
      for (const [shiftTypeId, minCount] of Object.entries(minimums)) {
        if (!minCount || minCount <= 0) continue
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
