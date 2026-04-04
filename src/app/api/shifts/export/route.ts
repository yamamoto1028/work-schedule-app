import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const HOLIDAYS_2026 = [
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23','2026-03-20',
  '2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23','2026-12-23',
]

function isHoliday(dateStr: string): boolean {
  return HOLIDAYS_2026.includes(dateStr)
}

function hexToArgb(hex: string): string {
  return 'FF' + hex.replace('#', '').toUpperCase().padEnd(6, '0')
}

// 0始まりの列インデックスをExcel列名に変換 (0→A, 1→B, 26→AA ...)
function colName(index: number): string {
  let result = ''
  let n = index + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

const THIN_BORDER = {
  top: { style: 'thin' as ExcelJS.BorderStyle },
  bottom: { style: 'thin' as ExcelJS.BorderStyle },
  left: { style: 'thin' as ExcelJS.BorderStyle },
  right: { style: 'thin' as ExcelJS.BorderStyle },
}

// GET /api/shifts/export?month=YYYY-MM&facilityId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM
  const facilityId = searchParams.get('facilityId')

  if (!month || !facilityId) {
    return NextResponse.json({ error: 'month and facilityId are required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role, facility_id')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin' || userData.facility_id !== facilityId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const startDate = `${month}-01`
  const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`

  const [staffResult, shiftTypesResult, leaveTypesResult, shiftsResult, leavesResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, display_name, staff_profiles(position, employment_type)')
      .eq('facility_id', facilityId)
      .eq('role', 'staff')
      .eq('is_active', true)
      .order('display_name'),
    supabase.from('shift_types').select('id, name, short_name, color, time_zone').eq('facility_id', facilityId).eq('is_active', true),
    supabase.from('leave_types').select('id, name, key, color').eq('facility_id', facilityId).eq('is_active', true),
    supabase.from('shifts')
      .select('user_id, shift_type_id, date')
      .eq('facility_id', facilityId)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['draft', 'published', 'confirmed']),
    supabase.from('leave_requests')
      .select('user_id, leave_type_id, date')
      .eq('facility_id', facilityId)
      .eq('status', 'approved')
      .gte('date', startDate)
      .lte('date', endDate),
  ])

  const staff = staffResult.data ?? []
  const shiftTypes = shiftTypesResult.data ?? []
  const leaveTypes = leaveTypesResult.data ?? []
  const shifts = shiftsResult.data ?? []
  const leaves = leavesResult.data ?? []

  type ShiftTypeRow = typeof shiftTypes[number]
  type LeaveTypeRow = typeof leaveTypes[number]
  const shiftTypeMap = new Map<string, ShiftTypeRow>(shiftTypes.map(t => [t.id, t]))
  const leaveTypeMap = new Map<string, LeaveTypeRow>(leaveTypes.map(t => [t.id, t]))

  type CellData = { text: string; color: string; isNight: boolean }
  const cellMap = new Map<string, CellData>()

  for (const s of shifts) {
    const st = shiftTypeMap.get(s.shift_type_id)
    if (!st) continue
    cellMap.set(`${s.user_id}:${s.date}`, { text: st.short_name, color: st.color, isNight: st.time_zone === 'night' })
  }
  for (const l of leaves) {
    if (cellMap.has(`${l.user_id}:${l.date}`)) continue // シフト優先
    const lt = leaveTypeMap.get(l.leave_type_id)
    if (!lt) continue
    // key を略称として使用（例: paid_leave → 有）。なければ name の先頭1文字
    const shortText = lt.key === 'paid_leave' ? '有' : lt.key === 'sick_leave' ? '病' : lt.key === 'maternity' ? '産' : lt.key === 'childcare' ? '育' : lt.name.charAt(0)
    cellMap.set(`${l.user_id}:${l.date}`, { text: shortText, color: lt.color, isNight: false })
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'YOMOGI'
  workbook.created = new Date()

  const HEADER_BG = 'FF404040'
  const HEADER_FG = 'FFFFFFFF'
  const SUBHEADER_BG = 'FFD0D0D0'
  const TOTAL_BG = 'FFFFFDE7'
  const SAT_BG = 'FFD6E4F0'
  const SUN_BG = 'FFFAD7D7'
  const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

  // --- シート1: シフト表 ---
  const sheetName = `${y}年${m}月シフト表`
  const ws = workbook.addWorksheet(sheetName)

  ws.getColumn(1).width = 14
  for (let d = 1; d <= daysInMonth; d++) ws.getColumn(d + 1).width = 5
  ws.getColumn(daysInMonth + 2).width = 8
  ws.getColumn(daysInMonth + 3).width = 7
  ws.getColumn(daysInMonth + 4).width = 7

  // ヘッダー行
  const headerRow = ws.getRow(1)
  headerRow.height = 24

  const titleCell = headerRow.getCell(1)
  titleCell.value = sheetName
  titleCell.font = { bold: true, color: { argb: HEADER_FG }, name: 'Arial', size: 10 }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' }
  titleCell.border = THIN_BORDER

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`
    const dow = new Date(dateStr).getDay()
    const isSat = dow === 6
    const isSunOrHol = dow === 0 || isHoliday(dateStr)
    const bgArgb = isSat ? SAT_BG : isSunOrHol ? SUN_BG : HEADER_BG
    const fgArgb = (isSat || isSunOrHol) ? 'FF333333' : HEADER_FG

    const cell = headerRow.getCell(d + 1)
    cell.value = `${d}\n${DAY_NAMES[dow]}`
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.font = { bold: true, color: { argb: fgArgb }, name: 'Arial', size: 9 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
    cell.border = THIN_BORDER
  }

  const totalHeaders = [
    { label: '出勤日数', col: daysInMonth + 2 },
    { label: '日中帯', col: daysInMonth + 3 },
    { label: '夜間帯', col: daysInMonth + 4 },
  ]
  for (const { label, col } of totalHeaders) {
    const cell = headerRow.getCell(col)
    cell.value = label
    cell.font = { bold: true, color: { argb: HEADER_FG }, name: 'Arial', size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = THIN_BORDER
  }

  // スタッフ行
  staff.forEach((member, rowIdx) => {
    const excelRow = rowIdx + 2
    const row = ws.getRow(excelRow)
    row.height = 18

    const nameCell = row.getCell(1)
    nameCell.value = member.display_name
    nameCell.font = { bold: true, name: 'Arial', size: 10 }
    nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEADER_BG } }
    nameCell.alignment = { horizontal: 'left', vertical: 'middle' }
    nameCell.border = THIN_BORDER

    let dayCount = 0
    let nightCount = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`
      const dow = new Date(dateStr).getDay()
      const isSat = dow === 6
      const isSunOrHol = dow === 0 || isHoliday(dateStr)
      const cell = row.getCell(d + 1)
      const data = cellMap.get(`${member.id}:${dateStr}`)

      if (data) {
        cell.value = data.text
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(data.color) } }
        cell.font = { color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 9 }
        if (data.isNight) { nightCount++ } else { dayCount++ }
      } else {
        const bgArgb = isSat ? SAT_BG : isSunOrHol ? SUN_BG : 'FFFFFFFF'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
        cell.font = { name: 'Arial', size: 9 }
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = THIN_BORDER
    }

    // 集計列（COUNTA数式 + キャッシュ結果）
    const dataStart = `${colName(1)}${excelRow}` // B列
    const dataEnd = `${colName(daysInMonth)}${excelRow}`

    const totalCell = row.getCell(daysInMonth + 2)
    totalCell.value = { formula: `COUNTA(${dataStart}:${dataEnd})`, result: dayCount + nightCount }
    totalCell.font = { bold: true, name: 'Arial', size: 10 }
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' }
    totalCell.border = THIN_BORDER

    const dayCell = row.getCell(daysInMonth + 3)
    dayCell.value = dayCount
    dayCell.font = { name: 'Arial', size: 10 }
    dayCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
    dayCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dayCell.border = THIN_BORDER

    const nightCell = row.getCell(daysInMonth + 4)
    nightCell.value = nightCount
    nightCell.font = { name: 'Arial', size: 10 }
    nightCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
    nightCell.alignment = { horizontal: 'center', vertical: 'middle' }
    nightCell.border = THIN_BORDER
  })

  // 日中帯人数行・夜間帯人数行（2行）
  const dayZoneRow = ws.getRow(staff.length + 2)
  const nightZoneRow = ws.getRow(staff.length + 3)
  dayZoneRow.height = 18
  nightZoneRow.height = 18

  const dayLabelCell = dayZoneRow.getCell(1)
  dayLabelCell.value = '日中帯人数'
  dayLabelCell.font = { bold: true, name: 'Arial', size: 10 }
  dayLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
  dayLabelCell.alignment = { horizontal: 'left', vertical: 'middle' }
  dayLabelCell.border = THIN_BORDER

  const nightLabelCell = nightZoneRow.getCell(1)
  nightLabelCell.value = '夜間帯人数'
  nightLabelCell.font = { bold: true, name: 'Arial', size: 10 }
  nightLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
  nightLabelCell.alignment = { horizontal: 'left', vertical: 'middle' }
  nightLabelCell.border = THIN_BORDER

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`
    const dayCount = shifts.filter(s => {
      const st = shiftTypeMap.get(s.shift_type_id)
      return s.date === dateStr && st?.time_zone === 'day'
    }).length
    const nightCount = shifts.filter(s => {
      const st = shiftTypeMap.get(s.shift_type_id)
      const isAke = st ? (st.short_name.includes('明') || st.name.includes('明け')) : false
      return s.date === dateStr && st?.time_zone === 'night' && !isAke
    }).length

    const col = d + 1
    const dayCell = dayZoneRow.getCell(col)
    dayCell.value = dayCount
    dayCell.font = { bold: true, name: 'Arial', size: 10 }
    dayCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
    dayCell.alignment = { horizontal: 'center', vertical: 'middle' }
    dayCell.border = THIN_BORDER

    const nightCell = nightZoneRow.getCell(col)
    nightCell.value = nightCount
    nightCell.font = { bold: true, name: 'Arial', size: 10 }
    nightCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
    nightCell.alignment = { horizontal: 'center', vertical: 'middle' }
    nightCell.border = THIN_BORDER
  }
  for (let c = daysInMonth + 2; c <= daysInMonth + 4; c++) {
    dayZoneRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
    dayZoneRow.getCell(c).border = THIN_BORDER
    nightZoneRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
    nightZoneRow.getCell(c).border = THIN_BORDER
  }

  // --- シート2: スタッフ一覧 ---
  const ws2 = workbook.addWorksheet('スタッフ一覧')
  const ws2Headers = ['氏名', '役職', '雇用形態', '出勤日数', '日中帯', '夜間帯', '休暇日数']
  ws2.getColumn(1).width = 16
  ws2.getColumn(2).width = 14
  ws2.getColumn(3).width = 12
  for (let i = 4; i <= 7; i++) ws2.getColumn(i).width = 10

  const ws2HeaderRow = ws2.getRow(1)
  ws2HeaderRow.height = 18
  ws2Headers.forEach((label, i) => {
    const cell = ws2HeaderRow.getCell(i + 1)
    cell.value = label
    cell.font = { bold: true, color: { argb: HEADER_FG }, name: 'Arial', size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = THIN_BORDER
  })

  staff.forEach((member, i) => {
    const profile = member.staff_profiles as { position: string | null; employment_type: string | null } | null
    let dayCount = 0
    let nightCount = 0
    let leaveCount = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`
      const data = cellMap.get(`${member.id}:${dateStr}`)
      if (!data) continue
      if (data.isNight) {
        nightCount++
      } else {
        const isLeave = leaves.some(l => l.user_id === member.id && l.date === dateStr)
        if (isLeave) { leaveCount++ } else { dayCount++ }
      }
    }

    const row = ws2.getRow(i + 2)
    row.height = 16
    const values: (string | number)[] = [
      member.display_name,
      profile?.position ?? '',
      profile?.employment_type ?? '',
      dayCount + nightCount,
      dayCount,
      nightCount,
      leaveCount,
    ]
    values.forEach((v, ci) => {
      const cell = row.getCell(ci + 1)
      cell.value = v
      cell.font = { name: 'Arial', size: 10 }
      cell.alignment = { horizontal: ci === 0 ? 'left' : 'center', vertical: 'middle' }
      cell.border = THIN_BORDER
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    })
  })

  let buffer: ExcelJS.Buffer
  try {
    buffer = await workbook.xlsx.writeBuffer()
  } catch (e) {
    console.error('Excel生成エラー:', e)
    return NextResponse.json({ error: 'Excel生成に失敗しました' }, { status: 500 })
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const fileName = `YOMOGI_${y}年${m}月シフト表_${todayStr}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
