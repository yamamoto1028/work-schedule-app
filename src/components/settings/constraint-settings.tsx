'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Json } from '@/types/database'

type ConstraintSetting = {
  id: string
  constraint_key: string
  is_enabled: boolean
  value: Json
}

type ResponsibleRole = {
  id: string
  name: string
}

type ShiftType = {
  id: string
  name: string
  short_name: string
}

type Props = {
  facilityId: string
  constraints: ConstraintSetting[]
  responsibleRoles: ResponsibleRole[]
  shiftTypes: ShiftType[]
}

const constraintMeta: Record<string, { label: string; description: string; category: string; valueField?: { key: string; label: string; min?: number; max?: number }; startDayField?: boolean; roleField?: boolean; shiftCountField?: boolean }> = {
  rest_after_night_off: { label: '夜勤明け翌日を必ず休みにする', description: '明け → 休 の強制', category: 'A' },
  no_day_shift_after_night: { label: '夜間帯勤務翌日の日中帯シフトを禁止', description: '時間帯分類に基づく制約', category: 'A' },
  max_consecutive_day_only: { label: '日中帯のみスタッフの連勤上限', description: '超えたら翌日休みを挿入', category: 'A', valueField: { key: 'days', label: '上限日数', min: 1, max: 14 } },
  max_consecutive_with_night: { label: '夜勤ありスタッフの連勤上限', description: '夜勤明け含む', category: 'A', valueField: { key: 'days', label: '上限日数', min: 1, max: 14 } },
  max_consecutive_days: { label: '全スタッフ共通の連続勤務最大日数', description: '', category: 'A', valueField: { key: 'days', label: '最大日数', min: 1, max: 14 } },
  min_days_off_per_month: { label: '月間最低休日保証日数', description: '', category: 'A', valueField: { key: 'days', label: '最低日数', min: 0, max: 31 } },
  min_weekly_days_off: { label: '週あたり最低休日数', description: '', category: 'A', valueField: { key: 'days', label: '最低日数', min: 0, max: 7 } },
  max_monthly_shifts: { label: '月最大勤務数（全スタッフ共通）', description: 'スタッフ個人設定で上書き可', category: 'A', valueField: { key: 'shifts', label: '最大勤務数', min: 1, max: 31 } },
  night_shift_equal_distribution: { label: '夜勤回数を均等配分する', description: '夜勤対象スタッフ間で均等', category: 'B' },
  max_night_shifts_per_month: { label: '月あたりの夜間帯勤務上限', description: '全スタッフ共通', category: 'B', valueField: { key: 'count', label: '上限回数', min: 0, max: 31 } },
  night_shift_responsible_interval: { label: 'N日ごとに指定責任者区分の夜勤1名配置', description: '指定した責任者区分のスタッフが一定間隔で夜勤に入るよう強制', category: 'B', valueField: { key: 'interval_days', label: '間隔（日）', min: 1, max: 31 }, startDayField: true, roleField: true },
  min_staff_per_shift_type: { label: '勤務区分ごとの1日最低配置人数', description: '各勤務区分に必要な最低スタッフ数を設定。未達の日をエラー検出', category: 'C', shiftCountField: true },
  require_skill_match: { label: '勤務区分に必要スキル保有者を必ず配置', description: '', category: 'C' },
  require_responsible_day_zone: { label: '日中帯に責任者（主任・副主任・夜勤責任者）を1名以上配置', description: '当該役職のスタッフが日中帯シフトに不在の日をエラー検出', category: 'C' },
  require_responsible_night_zone: { label: '夜間帯に責任者（主任・副主任・夜勤責任者）を1名以上配置', description: '当該役職のスタッフが夜間帯シフトに不在の日をエラー検出', category: 'C' },
  half_staff_isolation: { label: '半人前職員を同一シフトに複数配置しない', description: 'staff_grade = half/new が対象', category: 'D' },
}

const categoryLabels: Record<string, string> = {
  A: 'A: 連勤・休日ルール',
  B: 'B: 夜勤回数・配置ルール',
  C: 'C: シフト人数・構成ルール',
  D: 'D: スタッフ属性別制約',
}

export default function ConstraintSettings({ facilityId, constraints: initialConstraints, responsibleRoles: initialRoles = [], shiftTypes: initialShiftTypes = [] }: Props) {
  const router = useRouter()
  const [constraints, setConstraints] = useState(initialConstraints)
  const [responsibleRoles, setResponsibleRoles] = useState(initialRoles)
  const [shiftTypes, setShiftTypes] = useState(initialShiftTypes)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('responsible_roles').select('id, name').eq('facility_id', facilityId),
      supabase.from('shift_types').select('id, name, short_name').eq('facility_id', facilityId).eq('is_active', true).order('sort_order'),
    ]).then(([{ data: roles }, { data: types }]) => {
      if (roles) setResponsibleRoles(roles)
      if (types) setShiftTypes(types)
    })
  }, [facilityId])

  const getConstraint = (key: string) => constraints.find((c) => c.constraint_key === key)

  const handleToggle = async (key: string, current: boolean) => {
    const supabase = createClient()
    const existing = getConstraint(key)

    if (existing) {
      await supabase
        .from('constraint_settings')
        .update({ is_enabled: !current })
        .eq('id', existing.id)
      setConstraints(prev => prev.map((c) => c.constraint_key === key ? { ...c, is_enabled: !current } : c))
    } else {
      const { data } = await supabase
        .from('constraint_settings')
        .insert({ facility_id: facilityId, constraint_key: key, is_enabled: true, value: {} })
        .select()
        .single()
      if (data) setConstraints(prev => [...prev, data])
    }
    router.refresh()
  }

  const handleValueChange = async (key: string, valueKey: string, value: number) => {
    const supabase = createClient()
    const existing = getConstraint(key)
    const newValue = { ...(existing?.value as Record<string, unknown> ?? {}), [valueKey]: value } as unknown as Json

    if (existing) {
      await supabase.from('constraint_settings').update({ value: newValue as Json }).eq('id', existing.id)
      setConstraints(prev => prev.map((c) => c.constraint_key === key ? { ...c, value: newValue as Json } : c))
    } else {
      const { data } = await supabase
        .from('constraint_settings')
        .insert({ facility_id: facilityId, constraint_key: key, is_enabled: true, value: newValue as Json })
        .select()
        .single()
      if (data) setConstraints(prev => [...prev, data as ConstraintSetting])
    }
  }

  const handleStringValueChange = async (key: string, valueKey: string, value: string) => {
    const supabase = createClient()
    const existing = getConstraint(key)
    const newValue = { ...(existing?.value as Record<string, unknown> ?? {}), [valueKey]: value } as unknown as Json

    if (existing) {
      await supabase.from('constraint_settings').update({ value: newValue as Json }).eq('id', existing.id)
      setConstraints(prev => prev.map((c) => c.constraint_key === key ? { ...c, value: newValue as Json } : c))
    } else {
      const { data } = await supabase
        .from('constraint_settings')
        .insert({ facility_id: facilityId, constraint_key: key, is_enabled: true, value: newValue as Json })
        .select()
        .single()
      if (data) setConstraints(prev => [...prev, data as ConstraintSetting])
    }
  }

  const categories = [...new Set(Object.values(constraintMeta).map((m) => m.category))].sort()

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const catConstraints = Object.entries(constraintMeta).filter(([, m]) => m.category === cat)
        return (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-base">{categoryLabels[cat]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {catConstraints.map(([key, meta]) => {
                const constraint = getConstraint(key)
                const isEnabled = constraint?.is_enabled ?? false
                const currentValue = (constraint?.value as Record<string, unknown> | undefined) ?? {}

                return (
                  <div key={key} className="flex items-start gap-4 p-3 border rounded-lg">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(key, isEnabled)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                          {meta.label}
                        </span>
                      </div>
                      {meta.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{meta.description}</p>
                      )}
                      {isEnabled && meta.shiftCountField && (
                        <div className="flex flex-wrap gap-3 mt-2">
                          {shiftTypes.map((st) => (
                            <div key={st.id} className="flex items-center gap-1.5">
                              <Label className="text-xs text-gray-600 w-16 truncate" title={st.name}>{st.name}</Label>
                              <Input
                                type="number"
                                min={0}
                                max={99}
                                value={(currentValue[st.id] as number) ?? 0}
                                onChange={(e) => handleValueChange(key, st.id, parseInt(e.target.value) || 0)}
                                className="w-14 h-7 text-sm"
                              />
                              <span className="text-xs text-gray-500">名</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isEnabled && (meta.valueField || meta.roleField) && (
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {meta.roleField && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-gray-600">対象責任者区分:</Label>
                              <Select
                                value={(currentValue.responsible_role_name as string | undefined) ?? 'none'}
                                onValueChange={(v) => handleStringValueChange(key, 'responsible_role_name', v ?? 'none')}
                              >
                                <SelectTrigger className="w-40 h-7 text-sm">
                                  <SelectValue placeholder="区分を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">選択してください</SelectItem>
                                  {responsibleRoles.map((r) => (
                                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {meta.valueField && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-gray-600">{meta.valueField.label}:</Label>
                              <Input
                                type="number"
                                min={meta.valueField.min}
                                max={meta.valueField.max}
                                value={(currentValue[meta.valueField.key] as number) ?? meta.valueField.min}
                                onChange={(e) => handleValueChange(key, meta.valueField!.key, parseInt(e.target.value))}
                                className="w-20 h-7 text-sm"
                              />
                            </div>
                          )}
                          {meta.startDayField && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-gray-600">起日（月の何日目から）:</Label>
                              <Input
                                type="number"
                                min={1}
                                max={28}
                                value={(currentValue.start_day as number) ?? 1}
                                onChange={(e) => handleValueChange(key, 'start_day', parseInt(e.target.value))}
                                className="w-16 h-7 text-sm"
                              />
                              <span className="text-xs text-gray-500">日</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
