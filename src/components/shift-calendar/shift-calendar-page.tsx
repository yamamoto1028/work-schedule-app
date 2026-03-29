'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { checkConstraints, ShiftEntry, ConstraintViolation } from '@/lib/constraints/checker'
import ShiftCalendarGrid from './shift-calendar-grid'
import ShiftListView from './shift-list-view'
import YomogiPanel from '@/components/yomogi/yomogi-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Loader2, LayoutGrid, LayoutList, EyeOff, Trash2 } from 'lucide-react'
import type { GeneratedShift, DissatisfactionScore, AIFixedShiftInput } from '@/lib/ai/yomogi'

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
  start_time: string | null
  end_time: string | null
}

export type ShiftRow = {
  id: string
  user_id: string
  shift_type_id: string
  date: string
  status: 'draft' | 'published' | 'confirmed'
}

type Props = {
  facilityId: string
  initialYear: number
  initialMonth: number
  staff: StaffMember[]
  shiftTypes: ShiftType[]
  facilityType: 'hospital' | 'care_facility'
}

export default function ShiftCalendarPage({
  facilityId,
  initialYear,
  initialMonth,
  staff,
  shiftTypes,
  facilityType,
}: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [violations, setViolations] = useState<ConstraintViolation[]>([])
  const [constraints, setConstraints] = useState<{ constraint_key: string; is_enabled: boolean; value: Record<string, unknown> }[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [dissatisfactionScores, setDissatisfactionScores] = useState<Map<string, number>>(new Map())
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const supabase = createClient()

  const fetchShifts = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data } = await supabase
      .from('shifts')
      .select('id, user_id, shift_type_id, date, status')
      .eq('facility_id', facilityId)
      .gte('date', startDate)
      .lte('date', endDate)

    setShifts(data ?? [])
    setLoading(false)
  }, [facilityId, year, month, supabase])

  const fetchConstraints = useCallback(async () => {
    const { data } = await supabase
      .from('constraint_settings')
      .select('constraint_key, is_enabled, value')
      .eq('facility_id', facilityId)

    setConstraints(
      (data ?? []).map(c => ({
        constraint_key: c.constraint_key,
        is_enabled: c.is_enabled,
        value: (c.value as Record<string, number>) ?? {},
      }))
    )
  }, [facilityId, supabase])

  useEffect(() => {
    fetchShifts()
    fetchConstraints()
  }, [fetchShifts, fetchConstraints])

  // 制約チェック（シフト変更時に再計算）
  useEffect(() => {
    if (shifts.length === 0 || shiftTypes.length === 0) {
      setViolations([])
      return
    }

    const staffRoleMap = new Map(
      staff.map(m => [m.id, m.staff_profiles?.responsible_roles?.name ?? null])
    )

    const staffAllowedMap = new Map(
      staff.map(m => [m.id, m.staff_profiles?.allowed_shift_type_ids ?? []])
    )

    const entries: ShiftEntry[] = shifts.map(s => {
      const st = shiftTypes.find(t => t.id === s.shift_type_id)
      return {
        userId: s.user_id,
        date: s.date,
        shiftTypeId: s.shift_type_id,
        timeZone: st?.time_zone ?? 'day',
        shortName: st?.short_name ?? '',
        responsibleRoleName: staffRoleMap.get(s.user_id) ?? null,
        allowedShiftTypeIds: staffAllowedMap.get(s.user_id) ?? [],
      }
    })

    const shiftTypeNames = new Map(shiftTypes.map(t => [t.id, t.name]))
    const v = checkConstraints(entries, constraints, year, month, shiftTypeNames)
    setViolations(v)
  }, [shifts, constraints, shiftTypes, year, month])

  const goToPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  const goToNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const handleShiftChange = async (userId: string, date: string, shiftTypeId: string | null) => {
    const existing = shifts.find(s => s.user_id === userId && s.date === date)

    if (shiftTypeId === null) {
      // 削除
      if (!existing) return
      await supabase.from('shifts').delete().eq('id', existing.id)
      setShifts(prev => prev.filter(s => s.id !== existing.id))
      return
    }

    if (existing) {
      // 更新
      const { data } = await supabase
        .from('shifts')
        .update({ shift_type_id: shiftTypeId })
        .eq('id', existing.id)
        .select('id, user_id, shift_type_id, date, status')
        .single()
      if (data) setShifts(prev => prev.map(s => s.id === data.id ? data : s))
    } else {
      // 新規
      const { data } = await supabase
        .from('shifts')
        .insert({ facility_id: facilityId, user_id: userId, shift_type_id: shiftTypeId, date, status: 'draft' })
        .select('id, user_id, shift_type_id, date, status')
        .single()
      if (data) setShifts(prev => [...prev, data])
    }
  }

  const handleShiftMove = async (fromUserId: string, fromDate: string, toUserId: string, toDate: string) => {
    const fromShift = shifts.find(s => s.user_id === fromUserId && s.date === fromDate)
    const toShift = shifts.find(s => s.user_id === toUserId && s.date === toDate)
    if (!fromShift) return

    if (toShift) {
      // 2セル間でシフト種別をswap
      await Promise.all([
        supabase.from('shifts').update({ shift_type_id: toShift.shift_type_id }).eq('id', fromShift.id),
        supabase.from('shifts').update({ shift_type_id: fromShift.shift_type_id }).eq('id', toShift.id),
      ])
      setShifts(prev => prev.map(s => {
        if (s.id === fromShift.id) return { ...s, shift_type_id: toShift.shift_type_id }
        if (s.id === toShift.id) return { ...s, shift_type_id: fromShift.shift_type_id }
        return s
      }))
    } else {
      // 空セルへ移動（ユーザー・日付を更新）
      await supabase.from('shifts').update({ user_id: toUserId, date: toDate }).eq('id', fromShift.id)
      setShifts(prev => prev.map(s =>
        s.id === fromShift.id ? { ...s, user_id: toUserId, date: toDate } : s
      ))
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    await supabase
      .from('shifts')
      .update({ status: 'published' })
      .eq('facility_id', facilityId)
      .eq('status', 'draft')
      .gte('date', startDate)
      .lte('date', endDate)

    // メール通知（失敗しても公開は完了）
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'shift_published', facilityId, year, month }),
    }).catch(() => null)

    await fetchShifts()
    setPublishing(false)
  }

  const handleUnpublish = async () => {
    setUnpublishing(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    await supabase
      .from('shifts')
      .update({ status: 'draft' })
      .eq('facility_id', facilityId)
      .eq('status', 'published')
      .gte('date', startDate)
      .lte('date', endDate)

    await fetchShifts()
    setUnpublishing(false)
  }

  const handleClearAll = () => {
    if (!window.confirm(`${year}年${month}月の下書きシフトをすべて白紙に戻します。よろしいですか？\n※DBへの反映は「シフトを公開」ボタンで行われます。`)) return
    setShifts([])
  }

  const handleApplyAIShifts = async (generatedShifts: GeneratedShift[]) => {
    for (const gs of generatedShifts) {
      const existing = shifts.find(s => s.user_id === gs.user_id && s.date === gs.date)
      if (existing) {
        // 既存シフトは固定扱い — スキップ
        continue
      }
      const { data } = await supabase
        .from('shifts')
        .insert({ facility_id: facilityId, user_id: gs.user_id, shift_type_id: gs.shift_type_id, date: gs.date, status: 'draft' })
        .select('id, user_id, shift_type_id, date, status')
        .single()
      if (data) setShifts(prev => [...prev, data])
    }
  }

  const errorCount = violations.filter(v => v.severity === 'error').length
  const warningCount = violations.filter(v => v.severity === 'warning').length
  const hasDraft = shifts.some(s => s.status === 'draft')
  const hasPublished = shifts.some(s => s.status === 'published')

  const aiStaff = staff.map(s => ({
    id: s.id,
    display_name: s.display_name,
    can_night_shift: s.staff_profiles?.can_night_shift ?? false,
    staff_grade: s.staff_profiles?.staff_grade ?? 'full' as const,
    position: s.staff_profiles?.position ?? null,
    responsible_role: s.staff_profiles?.responsible_roles?.name ?? null,
    allowed_shift_type_ids: s.staff_profiles?.allowed_shift_type_ids ?? [],
  }))

  const aiShiftTypes = shiftTypes.map(t => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    time_zone: t.time_zone,
  }))

  const aiFixedShifts: AIFixedShiftInput[] = shifts.map(s => {
    const st = shiftTypes.find(t => t.id === s.shift_type_id)
    const member = staff.find(m => m.id === s.user_id)
    return {
      user_id: s.user_id,
      display_name: member?.display_name ?? s.user_id,
      date: s.date,
      shift_name: st?.name ?? '',
      time_zone: st?.time_zone ?? 'day',
    }
  })

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">シフト管理</h1>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goToPrevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold px-2 min-w-[120px] text-center">
              {year}年{month}月
            </span>
            <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 表示切替 */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={`rounded-none h-8 px-3 gap-1.5 ${viewMode === 'calendar' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              カレンダー
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-none h-8 px-3 gap-1.5 border-l ${viewMode === 'list' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'}`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              一覧
            </Button>
          </div>

          {/* 制約バッジ */}
          {errorCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              エラー {errorCount}件
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="gap-1 border-yellow-400 text-yellow-700 bg-yellow-50">
              <AlertTriangle className="h-3 w-3" />
              警告 {warningCount}件
            </Badge>
          )}
          {errorCount === 0 && warningCount === 0 && shifts.length > 0 && (
            <Badge variant="outline" className="gap-1 border-emerald-400 text-emerald-700 bg-emerald-50">
              <CheckCircle2 className="h-3 w-3" />
              制約OK
            </Badge>
          )}

          {/* 白紙に戻すボタン */}
          {hasDraft && !hasPublished && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              白紙に戻す
            </Button>
          )}

          {/* 非公開に戻すボタン */}
          {hasPublished && !hasDraft && (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              disabled={unpublishing}
              className="gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              {unpublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
              非公開に戻す
            </Button>
          )}

          {/* 公開ボタン */}
          {hasDraft && (
            <Button
              onClick={handlePublish}
              disabled={publishing || errorCount > 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              シフトを公開
            </Button>
          )}
        </div>
      </div>

      {/* ヨモギ主任パネル */}
      <YomogiPanel
        facilityId={facilityId}
        facilityType={facilityType}
        year={year}
        month={month}
        staff={aiStaff}
        shiftTypes={aiShiftTypes}
        constraints={constraints}
        fixedShifts={aiFixedShifts}
        onApplyShifts={handleApplyAIShifts}
        onScoresUpdate={(scores: DissatisfactionScore[]) => {
          const map = new Map<string, number>()
          scores.forEach(s => map.set(s.user_id, s.score))
          setDissatisfactionScores(map)
        }}
      />

      {/* カレンダー / 一覧表示 */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : viewMode === 'calendar' ? (
        <ShiftCalendarGrid
          year={year}
          month={month}
          staff={staff}
          shiftTypes={shiftTypes}
          shifts={shifts}
          violations={violations}
          dissatisfactionScores={dissatisfactionScores}
          onShiftChange={handleShiftChange}
          onShiftMove={handleShiftMove}
        />
      ) : (
        <ShiftListView
          year={year}
          month={month}
          staff={staff}
          shiftTypes={shiftTypes}
          shifts={shifts}
        />
      )}
    </div>
  )
}
