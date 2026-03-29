'use client'

import HolidayJP from '@holiday-jp/holiday_jp'
import { ShiftRow } from './shift-calendar-page'

type StaffMember = {
  id: string
  display_name: string
  staff_profiles: {
    employment_type: string | null
    position: string | null
    can_night_shift: boolean
    staff_grade: 'full' | 'half' | 'new'
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
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return dates
}

export default function ShiftListView({ year, month, staff, shiftTypes, shifts }: Props) {
  const dates = getDatesInMonth(year, month)
  const today = new Date().toISOString().split('T')[0]

  const shiftMap = new Map<string, ShiftRow[]>()
  for (const s of shifts) {
    if (!shiftMap.has(s.date)) shiftMap.set(s.date, [])
    shiftMap.get(s.date)!.push(s)
  }

  const staffMap = new Map(staff.map(m => [m.id, m]))
  const shiftTypeMap = new Map(shiftTypes.map(t => [t.id, t]))

  return (
    <div className="space-y-2">
      {dates.map(date => {
        const d = new Date(date)
        const weekday = d.getDay()
        const day = d.getDate()
        const isToday = date === today
        const isHoliday = HolidayJP.isHoliday(d)
        const isRed = weekday === 0 || isHoliday
        const isSat = weekday === 6

        const dayShifts = (shiftMap.get(date) ?? [])
          .slice()
          .sort((a, b) => {
            const ta = shiftTypeMap.get(a.shift_type_id)
            const tb = shiftTypeMap.get(b.shift_type_id)
            // day zone first, then night
            if (ta?.time_zone === tb?.time_zone) return 0
            return ta?.time_zone === 'day' ? -1 : 1
          })

        return (
          <div
            key={date}
            className={`border rounded-lg overflow-hidden ${isToday ? 'border-emerald-400 shadow-sm' : 'border-gray-200'}`}
          >
            {/* 日付ヘッダー */}
            <div
              className={`flex items-center gap-3 px-4 py-2 ${
                isToday
                  ? 'bg-emerald-50'
                  : isRed
                  ? 'bg-red-50'
                  : isSat
                  ? 'bg-blue-50'
                  : 'bg-gray-50'
              }`}
            >
              <span
                className={`text-base font-bold w-8 text-center ${
                  isToday ? 'text-emerald-700' : isRed ? 'text-red-600' : isSat ? 'text-blue-600' : 'text-gray-800'
                }`}
              >
                {day}
              </span>
              <span
                className={`text-sm font-medium ${
                  isRed ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-500'
                }`}
              >
                {WEEKDAY_LABELS[weekday]}
              </span>
              {isHoliday && (
                <span className="text-xs text-red-500 bg-red-100 px-1.5 py-0.5 rounded">祝</span>
              )}
              {isToday && (
                <span className="text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">今日</span>
              )}
              <span className="ml-auto text-xs text-gray-400">
                {dayShifts.length > 0 ? `${dayShifts.length}名` : '—'}
              </span>
            </div>

            {/* シフト一覧 */}
            {dayShifts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {dayShifts.map(shift => {
                  const member = staffMap.get(shift.user_id)
                  const shiftType = shiftTypeMap.get(shift.shift_type_id)
                  return (
                    <div key={shift.id} className="flex items-center gap-3 px-4 py-2 bg-white">
                      {/* 責任者ドット */}
                      {member?.staff_profiles?.responsible_roles && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: member.staff_profiles.responsible_roles.color }}
                        />
                      )}
                      {/* スタッフ名 */}
                      <span className="text-sm text-gray-800 w-28 shrink-0 truncate">
                        {member?.display_name ?? shift.user_id}
                      </span>
                      {/* 役職 */}
                      {member?.staff_profiles?.position && (
                        <span className="text-xs text-gray-400 w-20 shrink-0 truncate">
                          {member.staff_profiles.position}
                        </span>
                      )}
                      {/* シフト区分バッジ */}
                      {shiftType && (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded text-white shrink-0"
                          style={{ backgroundColor: shiftType.color }}
                        >
                          {shiftType.short_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{shiftType?.name}</span>
                      {/* ステータス */}
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        shift.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : shift.status === 'published'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {shift.status === 'confirmed' ? '確認済' : shift.status === 'published' ? '公開' : '下書'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 py-2 bg-white text-sm text-gray-300 text-center">シフトなし</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
