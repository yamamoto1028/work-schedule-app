'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Json } from '@/types/database'

type ConstraintSetting = {
  id: string
  constraint_key: string
  is_enabled: boolean
  value: Json
}

type Props = {
  facilityId: string
  constraints: ConstraintSetting[]
}

const constraintMeta: Record<string, { label: string; description: string; category: string; valueField?: { key: string; label: string; min?: number; max?: number } }> = {
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
  require_skill_match: { label: '勤務区分に必要スキル保有者を必ず配置', description: '', category: 'C' },
  half_staff_isolation: { label: '半人前職員を同一シフトに複数配置しない', description: 'staff_grade = half/new が対象', category: 'D' },
}

const categoryLabels: Record<string, string> = {
  A: 'A: 連勤・休日ルール',
  B: 'B: 夜勤回数・配置ルール',
  C: 'C: シフト人数・構成ルール',
  D: 'D: スタッフ属性別制約',
}

export default function ConstraintSettings({ facilityId, constraints: initialConstraints }: Props) {
  const router = useRouter()
  const [constraints, setConstraints] = useState(initialConstraints)

  const getConstraint = (key: string) => constraints.find((c) => c.constraint_key === key)

  const handleToggle = async (key: string, current: boolean) => {
    const supabase = createClient()
    const existing = getConstraint(key)

    if (existing) {
      await supabase
        .from('constraint_settings')
        .update({ is_enabled: !current })
        .eq('id', existing.id)
      setConstraints(constraints.map((c) => c.constraint_key === key ? { ...c, is_enabled: !current } : c))
    } else {
      const { data } = await supabase
        .from('constraint_settings')
        .insert({ facility_id: facilityId, constraint_key: key, is_enabled: true, value: {} })
        .select()
        .single()
      if (data) setConstraints([...constraints, data])
    }
    router.refresh()
  }

  const handleValueChange = async (key: string, valueKey: string, value: number) => {
    const supabase = createClient()
    const existing = getConstraint(key)
    const newValue = { ...(existing?.value as Record<string, unknown> ?? {}), [valueKey]: value } as unknown as Json

    if (existing) {
      await supabase.from('constraint_settings').update({ value: newValue as Json }).eq('id', existing.id)
      setConstraints(constraints.map((c) => c.constraint_key === key ? { ...c, value: newValue as Json } : c))
    } else {
      const { data } = await supabase
        .from('constraint_settings')
        .insert({ facility_id: facilityId, constraint_key: key, is_enabled: true, value: newValue as Json })
        .select()
        .single()
      if (data) setConstraints([...constraints, data as ConstraintSetting])
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
                const currentValue = (constraint?.value as Record<string, number> | undefined) ?? {}

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
                      {isEnabled && meta.valueField && (
                        <div className="flex items-center gap-2 mt-2">
                          <Label className="text-xs text-gray-600">{meta.valueField.label}:</Label>
                          <Input
                            type="number"
                            min={meta.valueField.min}
                            max={meta.valueField.max}
                            value={currentValue[meta.valueField.key] ?? meta.valueField.min}
                            onChange={(e) => handleValueChange(key, meta.valueField!.key, parseInt(e.target.value))}
                            className="w-20 h-7 text-sm"
                          />
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
