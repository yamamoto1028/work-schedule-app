'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import HolidayJP from '@holiday-jp/holiday_jp'
import { ConstraintViolation } from '@/lib/constraints/checker'
import { ShiftRow } from './shift-calendar-page'
import ShiftCell from './shift-cell'

type StaffMember = {
  id: string
  display_name: string
  staff_profiles: {
    employment_type: string | null
    position: string | null
    can_night_shift: boolean
    staff_grade: 'full' | 'half' | 'new'
    allowed_shift_type_ids: string[]
    responsible_roles: { name: string; color: string } | null
  } | null
}

type ShiftType = {
  id: string
  name: string
  short_name: string
  color: string
  time_zone: 'day' | 'night'
}

type Props = {
  year: number
  month: number
  staff: StaffMember[]
  shiftTypes: ShiftType[]
  shifts: ShiftRow[]
  violations: ConstraintViolation[]
  dissatisfactionScores?: Map<string, number>
  onShiftChange: (userId: string, date: string, shiftTypeId: string | null) => Promise<void>
  onShiftMove: (fromUserId: string, fromDate: string, toUserId: string, toDate: string) => Promise<void>
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const WEEKDAY_COLOR = ['text-red-500', 'text-gray-700', 'text-gray-700', 'text-gray-700', 'text-gray-700', 'text-gray-700', 'text-blue-500']

function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return dates
}

// ドロップ先セル（useDroppable フック）
function DroppableCell({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`w-full h-9 flex items-center justify-center transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-300 rounded' : ''
      }`}
    >
      {children}
    </div>
  )
}

export default function ShiftCalendarGrid({
  year, month, staff, shiftTypes, shifts, violations, dissatisfactionScores, onShiftChange, onShiftMove,
}: Props) {
  const [pendingCell, setPendingCell] = useState<string | null>(null)
  const [activeData, setActiveData] = useState<{ shiftTypeId: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const dates = getDatesInMonth(year, month)

  const violationMap = new Map<string, ConstraintViolation[]>()
  for (const v of violations) {
    const key = `${v.userId}_${v.date}`
    if (!violationMap.has(key)) violationMap.set(key, [])
    violationMap.get(key)!.push(v)
  }

  const shiftMap = new Map<string, ShiftRow>()
  for (const s of shifts) {
    shiftMap.set(`${s.user_id}_${s.date}`, s)
  }

  const handleCellChange = async (userId: string, date: string, shiftTypeId: string | null) => {
    const key = `${userId}_${date}`
    setPendingCell(key)
    await onShiftChange(userId, date, shiftTypeId)
    setPendingCell(null)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { shiftTypeId: string }
    setActiveData(data)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveData(null)
    const { active, over } = event
    if (!over) return

    const from = active.data.current as { userId: string; date: string }
    const toId = over.id as string
    // over.id format: "userId|date"
    const sepIdx = toId.indexOf('|')
    const toUserId = toId.slice(0, sepIdx)
    const toDate = toId.slice(sepIdx + 1)

    if (from.userId === toUserId && from.date === toDate) return

    const key = `${from.userId}_${from.date}`
    setPendingCell(key)
    await onShiftMove(from.userId, from.date, toUserId, toDate)
    setPendingCell(null)
  }

  const monthlyCount = new Map<string, number>()
  for (const s of shifts) {
    monthlyCount.set(s.user_id, (monthlyCount.get(s.user_id) ?? 0) + 1)
  }

  // 日付ごとの日中帯・夜間帯人数（明けは夜間帯カウントから除外）
  const dayZoneCount = new Map<string, number>()
  const nightZoneCount = new Map<string, number>()
  for (const s of shifts) {
    const st = shiftTypes.find(t => t.id === s.shift_type_id)
    if (!st) continue
    const isAke = st.short_name.includes('明') || st.name.includes('明け')
    if (st.time_zone === 'day') {
      dayZoneCount.set(s.date, (dayZoneCount.get(s.date) ?? 0) + 1)
    } else if (!isAke) {
      nightZoneCount.set(s.date, (nightZoneCount.get(s.date) ?? 0) + 1)
    }
  }

  const overlayShiftType = activeData
    ? shiftTypes.find(t => t.id === activeData.shiftTypeId)
    : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-auto border rounded-lg bg-white shadow-sm">
        <table className="border-collapse text-xs" style={{ minWidth: `${dates.length * 44 + 180}px` }}>
          <thead>
            <tr className="bg-gray-50 sticky top-0 z-10">
              <th className="sticky left-0 z-20 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left font-medium text-gray-600 min-w-[160px]">
                スタッフ
              </th>
              {dates.map(date => {
                const d = new Date(date)
                const day = d.getDate()
                const weekday = d.getDay()
                const isToday = date === new Date().toISOString().split('T')[0]
                const isHoliday = HolidayJP.isHoliday(d)
                const isRed = weekday === 0 || isHoliday
                const colorClass = isToday ? 'text-emerald-600' : isRed ? 'text-red-500' : WEEKDAY_COLOR[weekday]
                return (
                  <th
                    key={date}
                    className={`border-b border-r border-gray-200 px-0 py-1 text-center font-medium w-11 min-w-[44px] ${isToday ? 'bg-emerald-50' : ''}`}
                  >
                    <div className={`text-[11px] ${isRed ? 'text-red-500' : WEEKDAY_COLOR[weekday]}`}>{WEEKDAY_LABELS[weekday]}</div>
                    <div className={`text-[13px] font-bold ${colorClass}`}>{day}</div>
                  </th>
                )
              })}
              <th className="sticky right-0 z-20 bg-gray-50 border-b border-l border-gray-200 px-2 py-2 text-center font-medium text-gray-600 min-w-[48px]">
                月計
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member, rowIdx) => (
              <tr key={member.id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="sticky left-0 z-10 border-b border-r border-gray-200 px-2 py-1 min-w-[160px] bg-inherit">
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const score = dissatisfactionScores?.get(member.id)
                      if (score === undefined) return null
                      const color = score >= 70 ? 'bg-red-100 text-red-700' : score <= 30 ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                      return (
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded shrink-0 ${color}`} title="不満スコア">
                          {score}
                        </span>
                      )
                    })()}
                    {member.staff_profiles?.responsible_roles && (
                      <span
                        className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0 text-white"
                        style={{ backgroundColor: member.staff_profiles.responsible_roles.color }}
                        title={member.staff_profiles.responsible_roles.name}
                      >
                        {member.staff_profiles.responsible_roles.name}
                      </span>
                    )}
                    <span className="font-medium text-gray-800 truncate max-w-[100px]">{member.display_name}</span>
                  </div>
                  {member.staff_profiles?.position && (
                    <div className="text-[10px] text-gray-400 pl-1">{member.staff_profiles.position}</div>
                  )}
                </td>

                {dates.map(date => {
                  const cellKey = `${member.id}_${date}`
                  const droppableId = `${member.id}|${date}`
                  const shift = shiftMap.get(cellKey)
                  const cellViolations = violationMap.get(cellKey) ?? []
                  const isPending = pendingCell === cellKey
                  const isToday = date === new Date().toISOString().split('T')[0]

                  return (
                    <td
                      key={date}
                      className={`border-b border-r border-gray-200 p-0 w-11 min-w-[44px] ${isToday ? 'bg-emerald-50/30' : ''}`}
                    >
                      <DroppableCell id={droppableId}>
                        <ShiftCell
                          shift={shift}
                          userId={member.id}
                          date={date}
                          shiftTypes={shiftTypes}
                          violations={cellViolations}
                          isPending={isPending}
                          onSelect={(shiftTypeId) => handleCellChange(member.id, date, shiftTypeId)}
                        />
                      </DroppableCell>
                    </td>
                  )
                })}

                <td className="sticky right-0 z-10 border-b border-l border-gray-200 px-2 py-1 text-center bg-inherit">
                  <span className="text-sm font-semibold text-gray-700">
                    {monthlyCount.get(member.id) ?? 0}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-amber-50 border-t-2 border-amber-200">
              <td className="sticky left-0 z-10 bg-amber-50 border-r border-gray-200 px-2 py-1 text-[11px] font-bold text-amber-700">
                日中帯人数
              </td>
              {dates.map(date => (
                <td key={date} className="border-r border-gray-200 p-0 w-11 text-center">
                  <span className="text-[11px] font-semibold text-amber-700">
                    {dayZoneCount.get(date) ?? 0}
                  </span>
                </td>
              ))}
              <td className="sticky right-0 z-10 bg-amber-50 border-l border-gray-200" />
            </tr>
            <tr className="bg-indigo-50 border-t border-indigo-200">
              <td className="sticky left-0 z-10 bg-indigo-50 border-r border-gray-200 px-2 py-1 text-[11px] font-bold text-indigo-700">
                夜間帯人数
              </td>
              {dates.map(date => (
                <td key={date} className="border-r border-gray-200 p-0 w-11 text-center">
                  <span className="text-[11px] font-semibold text-indigo-700">
                    {nightZoneCount.get(date) ?? 0}
                  </span>
                </td>
              ))}
              <td className="sticky right-0 z-10 bg-indigo-50 border-l border-gray-200" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ドラッグ中のオーバーレイ */}
      <DragOverlay>
        {overlayShiftType ? (
          <span
            className="text-[11px] font-bold px-1.5 py-1 rounded text-white shadow-lg opacity-90 cursor-grabbing"
            style={{ backgroundColor: overlayShiftType.color }}
          >
            {overlayShiftType.short_name}
          </span>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
