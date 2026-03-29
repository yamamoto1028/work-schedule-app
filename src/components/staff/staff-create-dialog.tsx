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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { UserPlus, Loader2 } from 'lucide-react'

type ResponsibleRole = {
  id: string
  name: string
  color: string
}

type ShiftType = {
  id: string
  name: string
  short_name: string
}

type Props = {
  facilityId: string
  responsibleRoles: ResponsibleRole[]
  shiftTypes: ShiftType[]
}

export default function StaffCreateDialog({ facilityId, responsibleRoles, shiftTypes }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    display_name: '',
    email: '',
    password: '',
    employment_type: '',
    position: '',
    responsible_role_id: 'none',
    staff_grade: 'full' as 'full' | 'half' | 'new',
    can_night_shift: true,
    phone: '',
    allowed_shift_type_ids: [] as string[],
  })

  const toggleShiftType = (id: string) => {
    setForm(prev => ({
      ...prev,
      allowed_shift_type_ids: prev.allowed_shift_type_ids.includes(id)
        ? prev.allowed_shift_type_ids.filter(i => i !== id)
        : [...prev.allowed_shift_type_ids, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    // Supabase Auth でユーザー作成（管理者がinvite）
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          facility_id: facilityId,
          display_name: form.display_name,
          role: 'staff',
        },
      },
    })

    if (authError || !authData.user) {
      toast.error('アカウント作成に失敗しました: ' + authError?.message)
      setLoading(false)
      return
    }

    // staff_profiles の作成
    const { error: profileError } = await supabase.from('staff_profiles').insert({
      user_id: authData.user.id,
      facility_id: facilityId,
      employment_type: form.employment_type || null,
      position: form.position || null,
      responsible_role_id: form.responsible_role_id === 'none' ? null : form.responsible_role_id,
      staff_grade: form.staff_grade,
      can_night_shift: form.can_night_shift,
      phone: form.phone || null,
      allowed_shift_type_ids: form.allowed_shift_type_ids,
    })

    if (profileError) {
      toast.error('プロフィール作成に失敗しました')
      setLoading(false)
      return
    }

    toast.success(`${form.display_name}さんを追加しました`)
    setOpen(false)
    setForm({
      display_name: '',
      email: '',
      password: '',
      employment_type: '',
      position: '',
      responsible_role_id: 'none',
      staff_grade: 'full',
      can_night_shift: true,
      phone: '',
      allowed_shift_type_ids: [],
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        <UserPlus className="h-4 w-4" />スタッフ追加
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>スタッフ追加</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>氏名 *</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="山田 太郎"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="090-0000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>メールアドレス *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="yamada@facility.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>初期パスワード *</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="8文字以上"
              minLength={8}
              required
            />
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
                placeholder="介護士 等"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>責任者区分</Label>
              <Select
                value={form.responsible_role_id}
                onValueChange={(v) => setForm({ ...form, responsible_role_id: v ?? 'none' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="なし" />
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">フル職員</SelectItem>
                  <SelectItem value="half">半人前</SelectItem>
                  <SelectItem value="new">新人</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <Switch
              id="can-night"
              checked={form.can_night_shift}
              onCheckedChange={(v) => setForm({ ...form, can_night_shift: v })}
            />
            <Label htmlFor="can-night">夜勤可能</Label>
          </div>

          {shiftTypes.length > 0 && (
            <div className="space-y-2">
              <Label>入れるシフト制限（チェックなし = 全シフト可）</Label>
              <div className="flex flex-wrap gap-3 p-3 border rounded-lg bg-gray-50">
                {shiftTypes.map((st) => (
                  <div key={st.id} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`create-st-${st.id}`}
                      checked={form.allowed_shift_type_ids.includes(st.id)}
                      onCheckedChange={() => toggleShiftType(st.id)}
                    />
                    <Label htmlFor={`create-st-${st.id}`} className="text-sm font-normal cursor-pointer">
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
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '追加する'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
