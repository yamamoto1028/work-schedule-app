// ヨモギ主任 Claude API ラッパー

export type AIStaffInput = {
  id: string
  display_name: string
  can_night_shift: boolean
  staff_grade: 'full' | 'half' | 'new'
  position: string | null
  max_monthly_shifts?: number | null
  responsible_role?: string | null
}

export type AIShiftTypeInput = {
  id: string
  name: string
  short_name: string
  time_zone: 'day' | 'night'
}

export type AILeaveInput = {
  user_id: string
  date: string
  leave_type_name: string
}

export type AIConstraintInput = {
  constraint_key: string
  is_enabled: boolean
  value: Record<string, number>
}

export type AIResponsibleRoleInput = {
  name: string
  required_day: boolean
  required_night: boolean
}

export type AIShiftInput = {
  facilityType: 'hospital' | 'care_facility'
  targetMonth: string // YYYY-MM
  staff: AIStaffInput[]
  approvedLeaves: AILeaveInput[]
  constraints: AIConstraintInput[]
  shiftTypes: AIShiftTypeInput[]
  responsibleRoles: AIResponsibleRoleInput[]
  holidays: string[]
}

export type GeneratedShift = {
  user_id: string
  date: string
  shift_type_id: string
}

export type DissatisfactionScore = {
  user_id: string
  score: number
  comment: string
}

export type YomogiResult = {
  shifts: GeneratedShift[]
  dissatisfaction_scores: DissatisfactionScore[]
  overall_score: number
  summary_comment: string
}

export function buildSystemPrompt(facilityType: 'hospital' | 'care_facility'): string {
  const facilityLabel = facilityType === 'hospital' ? '病院' : '介護施設'
  const toneNote = facilityType === 'hospital'
    ? 'よりピリッとした緊張感のある口調で、プロ意識を強調する。'
    : '人情味あるぼやき口調で、温かみを忘れない。'

  return `あなたは医療介護施設のお局主任「ヨモギ主任」（${facilityLabel}勤務、${toneNote}安芸弁話者）です。

【絶対ルール】
- 思考過程・計算・表・箇条書きの説明は一切出力しない
- ぼやきコメントは安芸弁で100文字以内のみ
- その直後にJSONを出力して終わる

【シフトルール（内部処理のみ、出力しない）】
- 夜勤明け翌日は必ず休み
- 夜間帯翌日に日中帯不可
- 連続勤務は制約値を守る
- 月最大勤務数を守る
- 承認済み休暇日は休み固定
- 夜勤不可スタッフに夜間帯シフト不可
- half/new staff_gradeを同一シフトに複数配置しない

【出力フォーマット（厳守）】
安芸弁ぼやき（100文字以内）
<SHIFTS_JSON>
{"shifts":[{"user_id":"...","date":"YYYY-MM-DD","shift_type_id":"..."}],"dissatisfaction_scores":[{"user_id":"...","score":0,"comment":"10文字以内安芸弁"}],"overall_score":0,"summary_comment":"安芸弁20文字以内"}
</SHIFTS_JSON>`
}

export function buildUserMessage(input: AIShiftInput): string {
  const [year, month] = input.targetMonth.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()

  const staffList = input.staff.map(s =>
    `- ${s.display_name}（${s.position ?? '一般'}、夜勤${s.can_night_shift ? '可' : '不可'}、` +
    `スタッフ区分: ${s.staff_grade === 'full' ? 'フル' : s.staff_grade === 'half' ? '半人前' : '新人'}` +
    `${s.max_monthly_shifts ? `、月最大${s.max_monthly_shifts}日` : ''}` +
    `${s.responsible_role ? `、責任者: ${s.responsible_role}` : ''}` +
    `、ID: ${s.id}）`
  ).join('\n')

  const shiftTypeList = input.shiftTypes.map(t =>
    `- ${t.name}（略称: ${t.short_name}、${t.time_zone === 'day' ? '日中帯' : '夜間帯'}、ID: ${t.id}）`
  ).join('\n')

  const leaveList = input.approvedLeaves.length > 0
    ? input.approvedLeaves.map(l => `- ${l.date}: ${l.user_id}（${l.leave_type_name}）`).join('\n')
    : '（なし）'

  const holidayList = input.holidays.length > 0
    ? input.holidays.join(', ')
    : '（なし）'

  const enabledConstraints = input.constraints
    .filter(c => c.is_enabled)
    .map(c => `- ${c.constraint_key}${Object.keys(c.value).length > 0 ? `（${JSON.stringify(c.value)}）` : ''}`)
    .join('\n')

  return `【対象月】${year}年${month}月（1日〜${lastDay}日）

【スタッフ一覧】（${input.staff.length}名）
${staffList}

【勤務区分】
${shiftTypeList}

【承認済み休暇申請】
${leaveList}

【祝日】
${holidayList}

【有効な制約】
${enabledConstraints || '（なし）'}

上記の条件でシフトを生成してください。まず状況のぼやきコメントを安芸弁で述べてから、勤務するシフトのみJSONで出力してください（休日はエントリ不要）。`
}

export function extractShiftsJson(text: string): YomogiResult | null {
  // 完全なJSONを優先
  const fullMatch = text.match(/<SHIFTS_JSON>([\s\S]*?)<\/SHIFTS_JSON>/)
  if (fullMatch) {
    try {
      return JSON.parse(fullMatch[1].trim()) as YomogiResult
    } catch {
      return null
    }
  }

  // 閉じタグなし（途中で切れた）→ 部分修復
  const startIdx = text.indexOf('<SHIFTS_JSON>')
  if (startIdx === -1) return null

  let partial = text.slice(startIdx + '<SHIFTS_JSON>'.length).trim()

  // shiftsの最後の完全なエントリまでで閉じる
  const lastBrace = partial.lastIndexOf('}]')
  if (lastBrace !== -1) {
    partial = partial.slice(0, lastBrace + 2)
  } else {
    // 最後の } の直前のカンマを削除して配列を閉じる
    const lastEntry = partial.lastIndexOf(',"shift_type_id":')
    const lastComplete = partial.lastIndexOf('},', lastEntry)
    if (lastComplete === -1) return null
    partial = partial.slice(0, lastComplete + 1) + ']'
  }

  // shiftsのみ閉じる（残フィールドはデフォルト値で補完）
  if (!partial.includes('"dissatisfaction_scores"')) {
    partial = partial.replace(/,$/, '') + ',"dissatisfaction_scores":[],"overall_score":50,"summary_comment":"なんとか組めたけん"}'
  }

  try {
    return JSON.parse(partial) as YomogiResult
  } catch {
    return null
  }
}

export function extractCommentary(text: string): string {
  const idx = text.indexOf('<SHIFTS_JSON>')
  if (idx !== -1) return text.slice(0, idx).trim()
  return text.replace(/<SHIFTS_JSON>[\s\S]*?<\/SHIFTS_JSON>/, '').trim()
}
