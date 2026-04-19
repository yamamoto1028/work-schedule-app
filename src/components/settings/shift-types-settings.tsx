'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Sun, Moon } from 'lucide-react'

type ShiftType = {
  id: string
  name: string
  short_name: string
  color: string
  start_time: string | null
  end_time: string | null
  time_zone: 'day' | 'night'
  is_active: boolean
  sort_order: number
}

type Props = {
  facilityId: string
  shiftTypes: ShiftType[]
}

const defaultColors = ['#4DB6AC', '#4472C4', '#7E57C2', '#1565C0', '#90A4AE', '#EF5350', '#FF9800', '#66BB6A']

export default function ShiftTypesSettings({ facilityId, shiftTypes: initialTypes }: Props) {
  const router = useRouter()
  const [shiftTypes, setShiftTypes] = useState(initialTypes)
  const [newForm, setNewForm] = useState({
    name: '',
    short_name: '',
    color: '#4472C4',
    start_time: '',
    end_time: '',
    time_zone: 'day' as 'day' | 'night',
  })

  const handleAdd = async () => {
    if (!newForm.name || !newForm.short_name) {
      toast.error('名称と略称は必須です')
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('shift_types')
      .insert({
        facility_id: facilityId,
        name: newForm.name,
        short_name: newForm.short_name,
        color: newForm.color,
        start_time: newForm.start_time || null,
        end_time: newForm.end_time || null,
        time_zone: newForm.time_zone,
        sort_order: shiftTypes.length,
      })
      .select()
      .single()

    if (error) {
      toast.error('追加に失敗しました')
      return
    }

    setShiftTypes([...shiftTypes, data])
    setNewForm({ name: '', short_name: '', color: '#4472C4', start_time: '', end_time: '', time_zone: 'day' })
    toast.success('勤務区分を追加しました')
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('shift_types').delete().eq('id', id)
    if (error) {
      toast.error('削除できません。この勤務区分は既存のシフトで使用されています。削除の代わりに無効化をご利用ください。')
      return
    }
    setShiftTypes(shiftTypes.filter((t) => t.id !== id))
    toast.success('削除しました')
    router.refresh()
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('shift_types').update({ is_active: !current }).eq('id', id)
    setShiftTypes(shiftTypes.map((t) => t.id === id ? { ...t, is_active: !current } : t))
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* 既存一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>勤務区分一覧</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {shiftTypes.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">勤務区分が登録されていません</p>
          ) : (
            shiftTypes.map((st) => (
              <div key={st.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                <div
                  className="w-3 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: st.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{st.name}</span>
                    <Badge variant="outline" className="text-xs">{st.short_name}</Badge>
                    <Badge
                      variant="outline"
                      className={st.time_zone === 'day' ? 'text-amber-600 border-amber-300 bg-amber-50' : 'text-indigo-600 border-indigo-300 bg-indigo-50'}
                    >
                      {st.time_zone === 'day' ? (
                        <><Sun className="h-3 w-3 mr-1" />日中帯</>
                      ) : (
                        <><Moon className="h-3 w-3 mr-1" />夜間帯</>
                      )}
                    </Badge>
                  </div>
                  {(st.start_time || st.end_time) && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {st.start_time} 〜 {st.end_time}
                    </div>
                  )}
                </div>
                <Switch
                  checked={st.is_active}
                  onCheckedChange={() => handleToggleActive(st.id, st.is_active)}
                  className="shrink-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                  onClick={() => handleDelete(st.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 新規追加フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            勤務区分を追加
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="例：日勤"
              />
            </div>
            <div className="space-y-2">
              <Label>略称 * （シフト表に表示）</Label>
              <Input
                value={newForm.short_name}
                onChange={(e) => setNewForm({ ...newForm, short_name: e.target.value })}
                placeholder="例：日"
                maxLength={4}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>時間帯区分 *</Label>
              <Select
                value={newForm.time_zone}
                onValueChange={(v) => setNewForm({ ...newForm, time_zone: v as 'day' | 'night' })}
              >
                <SelectTrigger>
                  <span>{newForm.time_zone === 'day' ? '日中帯' : '夜間帯'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">日中帯</SelectItem>
                  <SelectItem value="night">夜間帯</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>開始時刻</Label>
              <Input
                type="time"
                value={newForm.start_time}
                onChange={(e) => setNewForm({ ...newForm, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>終了時刻</Label>
              <Input
                type="time"
                value={newForm.end_time}
                onChange={(e) => setNewForm({ ...newForm, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>表示色</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newForm.color}
                onChange={(e) => setNewForm({ ...newForm, color: e.target.value })}
                className="h-10 w-16 rounded border cursor-pointer"
              />
              <div className="flex gap-2 flex-wrap">
                {defaultColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: c, outline: newForm.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                    onClick={() => setNewForm({ ...newForm, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            追加する
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
