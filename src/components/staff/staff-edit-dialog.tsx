'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { toggleArrayItem } from '@/lib/utils'

type ResponsibleRole = { id: string; name: string; color: string }
type ShiftType = { id: string; name: string; short_name: string }
type Floor = { id: string; name: string; sort_order: number }
type Block = { id: string; floor_id: string | null; name: string; color: string; sort_order: number }

type StaffProfile = {
  id: string
  employment_type: string | null
  position: string | null
  responsible_role_id: string | null
  can_night_shift: boolean
  max_monthly_shifts: number | null
  phone: string | null
  staff_grade: 'full' | 'half' | 'new'
  fixed_night_count: number | null
  allowed_shift_type_ids: string[]
  skills: string[]
  block_id: string | null
  responsible_roles: { name: string; color: string } | null
}

type StaffUser = {
  id: string
  email: string
  display_name: string
  is_active: boolean
  staff_profiles: StaffProfile | null
}

type Props = {
  staff: StaffUser
  facilityId: string
  responsibleRoles: ResponsibleRole[]
  shiftTypes: ShiftType[]
  plan?: 'free' | 'pro' | 'enterprise'
  floors?: Floor[]
  blocks?: Block[]
  open: boolean
  onClose: () => void
}

export default function StaffEditDialog({ staff, facilityId, responsibleRoles, shiftTypes, plan = 'free', floors = [], blocks = [], open, onClose }: Props) {
  const router = useRouter()
  const profile = staff.staff_profiles
  const isEnterprise = plan === 'enterprise'
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    display_name: staff.display_name,
    employment_type: profile?.employment_type ?? '',
    position: profile?.position ?? '',
    responsible_role_id: profile?.responsible_role_id ?? 'none',
    staff_grade: (profile?.staff_grade ?? 'full') as 'full' | 'half' | 'new',
    can_night_shift: profile?.can_night_shift ?? true,
    max_monthly_shifts: profile?.max_monthly_shifts?.toString() ?? '',
    phone: profile?.phone ?? '',
    allowed_shift_type_ids: profile?.allowed_shift_type_ids ?? [],
    block_id: profile?.block_id ?? 'none',
  })

  const toggleShiftType = (id: string) => {
    setForm(prev => ({ ...prev, allowed_shift_type_ids: toggleArrayItem(prev.allowed_shift_type_ids, id) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const { error: userError } = await supabase
      .from('users')
      .update({ display_name: form.display_name })
      .eq('id', staff.id)

    if (userError) {
      toast.error('更新に失敗しました')
      setLoading(false)
      return
    }

    const profileData = {
      employment_type: form.employment_type || null,
      position: form.position || null,
      responsible_role_id: form.responsible_role_id === 'none' ? null : form.responsible_role_id,
      staff_grade: form.staff_grade,
      can_night_shift: form.can_night_shift,
      max_monthly_shifts: form.max_monthly_shifts ? parseInt(form.max_monthly_shifts) : null,
      phone: form.phone || null,
      allowed_shift_type_ids: form.allowed_shift_type_ids,
      block_id: form.block_id === 'none' ? null : form.block_id,
    }

    if (profile) {
      await supabase.from('staff_profiles').update(profileData).eq('id', profile.id)
    } else {
      await supabase.from('staff_profiles').insert({
        user_id: staff.id,
        facility_id: facilityId,
        ...profileData,
      })
    }

    toast.success('スタッフ情報を更新しました')
    onClose()
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>スタッフ編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>氏名 *</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>雇用形態</Label>
              <Input
                value={form.employment_type}
                onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                placeholder="常勤 / 非常勤 等"
              />
            </div>
            <div className="space-y-2">
              <Label>役職</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>責任者区分</Label>
              <Select
                value={form.responsible_role_id ?? 'none'}
                onValueChange={(v) => setForm({ ...form, responsible_role_id: v ?? 'none' })}
              >
                <SelectTrigger>
                  <span>{(form.responsible_role_id ?? 'none') === 'none' ? 'なし' : (responsibleRoles.find(r => r.id === form.responsible_role_id)?.name ?? 'なし')}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {responsibleRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>職員区分</Label>
              <Select
                value={form.staff_grade}
                onValueChange={(v) => setForm({ ...form, staff_grade: (v ?? 'full') as 'full' | 'half' | 'new' })}
              >
                <SelectTrigger>
                  <span>{{ full: 'フル職員', half: '半人前', new: '新人' }[form.staff_grade]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">フル職員</SelectItem>
                  <SelectItem value="half">半人前</SelectItem>
                  <SelectItem value="new">新人</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEnterprise && blocks.length > 0 && (
            <div className="space-y-2">
              <Label>所属ブロック</Label>
              <Select
                value={form.block_id}
                onValueChange={(v) => setForm({ ...form, block_id: v ?? 'none' })}
              >
                <SelectTrigger>
                  <span>
                    {form.block_id === 'none'
                      ? '未割当'
                      : blocks.find(b => b.id === form.block_id)?.name ?? '未割当'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未割当</SelectItem>
                  {floors.length > 0
                    ? floors.map(f => {
                        const fb = blocks.filter(b => b.floor_id === f.id)
                        if (fb.length === 0) return null
                        return fb.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {f.name} / {b.name}
                          </SelectItem>
                        ))
                      })
                    : blocks.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>月最大勤務数（空欄=施設デフォルト）</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={form.max_monthly_shifts}
              onChange={(e) => setForm({ ...form, max_monthly_shifts: e.target.value })}
              placeholder="22"
            />
          </div>

          <div className="flex items-center gap-3 py-2">
            <Switch
              id="can-night-edit"
              checked={form.can_night_shift}
              onCheckedChange={(v) => setForm({ ...form, can_night_shift: v })}
            />
            <Label htmlFor="can-night-edit">夜勤可能</Label>
          </div>

          {shiftTypes.length > 0 && (
            <div className="space-y-2">
              <Label>入れるシフト制限（チェックなし = 全シフト可）</Label>
              <div className="flex flex-wrap gap-3 p-3 border rounded-lg bg-gray-50">
                {shiftTypes.map((st) => (
                  <div key={st.id} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`edit-st-${st.id}`}
                      checked={form.allowed_shift_type_ids.includes(st.id)}
                      onCheckedChange={() => toggleShiftType(st.id)}
                    />
                    <Label htmlFor={`edit-st-${st.id}`} className="text-sm font-normal cursor-pointer">
                      {st.name}
                    </Label>
                  </div>
                ))}
              </div>
              {form.allowed_shift_type_ids.length > 0 && (
                <p className="text-xs text-amber-600">選択したシフトのみ割り当て可能になります</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '更新する'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
