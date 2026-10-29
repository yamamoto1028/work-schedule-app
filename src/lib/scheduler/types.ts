// シフト自動作成エンジンの入出力型

import type { ConstraintConfig, ConstraintViolation, StaffGrade } from '@/lib/constraints/types'

export type SchedulerStaff = {
  id: string
  name: string
  canNightShift: boolean
  staffGrade: StaffGrade
  maxMonthlyShifts: number | null
  fixedNightCount: number | null
  responsibleRoleName: string | null
  allowedShiftTypeIds: string[] // 空 = 制限なし
  weekendsHolidaysOff: boolean // 土日祝休み固定（土日祝は入れない・連勤上限なし・公休数は土日祝の日数）
}

// sort_order 順に並べて渡す（先頭の日中帯区分が「基本の日勤」になる）
export type SchedulerShiftType = {
  id: string
  name: string
  shortName: string
  timeZone: 'day' | 'night'
}

export type SchedulerAssignment = {
  userId: string
  date: string // YYYY-MM-DD
  shiftTypeId: string
}

export type SchedulerLeave = {
  userId: string
  date: string
  countsAsDayOff: boolean // true = 公休に含む（希望休）/ false = 公休とは別の休み（有給など）
}

export type SchedulerInput = {
  facilityType: 'hospital' | 'care_facility'
  year: number
  month: number
  staff: SchedulerStaff[]
  shiftTypes: SchedulerShiftType[]
  constraints: ConstraintConfig[]
  daysOff: number // 月の公休数
  leaves: SchedulerLeave[]
  fixedShifts: SchedulerAssignment[] // 当月の既存シフト（変更しない）
  previousShifts: SchedulerAssignment[] // 前月末のシフト（連勤・明けの引き継ぎ判定用）
  holidays: string[]
  seed: number
  iterations?: number
}

export type UnfilledSlot = {
  date: string
  shiftTypeId: string
  shiftTypeName: string
  required: number
  assigned: number
  reason: string
}

export type ScoreReason = 'consecutive' | 'night' | 'weekend' | 'scattered' | 'weekly_off' | 'shortfall' | 'none'

export type StaffScore = {
  userId: string
  score: number // 0〜100（高いほど不満）
  reason: ScoreReason
  comment: string
  workDays: number
  targetWorkDays: number
  nightCount: number
  weekendCount: number
  maxConsecutive: number
}

export type SchedulerResult = {
  assignments: SchedulerAssignment[] // 新規に追加するシフトのみ
  unfilled: UnfilledSlot[]
  violations: ConstraintViolation[] // 既存シフト + 新規シフトに対する制約チェック結果
  scores: StaffScore[]
  overallScore: number
  openingComment: string
  summaryComment: string
  seed: number
}
