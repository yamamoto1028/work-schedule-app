// 制約チェックの共通型

export type StaffGrade = 'full' | 'half' | 'new'

export type ShiftEntry = {
  userId: string
  date: string // YYYY-MM-DD
  shiftTypeId: string
  timeZone: 'day' | 'night'
  shortName: string
  shiftTypeName?: string
  responsibleRoleName?: string | null
  allowedShiftTypeIds?: string[] // 空 or undefined = 制限なし
  staffGrade?: StaffGrade
  maxMonthlyShifts?: number | null // スタッフ個人の月最大勤務数（施設設定より優先）
  weekendsHolidaysOff?: boolean // 土日祝休み固定（連勤上限・公休数の対象外）
}

export type ConstraintViolation = {
  userId: string
  date: string
  message: string
  severity: 'error' | 'warning'
}

export type ConstraintConfig = {
  constraint_key: string
  is_enabled: boolean
  value: Record<string, unknown>
}

export type CheckContext = {
  shifts: ShiftEntry[]
  byUser: Map<string, ShiftEntry[]>
  dates: string[]
  year: number
  month: number
  enabled: Map<string, ConstraintConfig> // is_enabled = true のものだけ
  holidays: Set<string> // 祝日（YYYY-MM-DD）
  shiftTypeNames?: Map<string, string>
}
