'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Trash2, Sun, Moon, ShieldCheck } from 'lucide-react'

type ResponsibleRole = {
  id: string
  name: string
  color: string
  require_day_zone: boolean
  require_day_zone_count: number
  require_night_zone: boolean
  require_night_zone_count: number
  can_create_shifts?: boolean
  is_active: boolean
}

type Props = {
  facilityId: string
  responsibleRoles: ResponsibleRole[]
}

export default function ResponsibleRolesSettings({ facilityId, responsibleRoles: initialRoles }: Props) {
  const router = useRouter()
  const [roles, setRoles] = useState(initialRoles)
  const [newForm, setNewForm] = useState({
    name: '',
    color: '#E25822',
    require_day_zone: true,
    require_day_zone_count: 1,
    require_night_zone: false,
    require_night_zone_count: 1,
    can_create_shifts: false,
  })

  const handleAdd = async () => {
    if (!newForm.name) {
      toast.error('名称は必須です')
      return
    }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('responsible_roles')
      .insert({ facility_id: facilityId, ...newForm })
      .select()
      .single()

    if (error) {
      toast.error('追加に失敗しました')
      return
    }
    setRoles([...roles, { can_create_shifts: false, ...data } as ResponsibleRole])
    setNewForm({ name: '', color: '#E25822', require_day_zone: true, require_day_zone_count: 1, require_night_zone: false, require_night_zone_count: 1, can_create_shifts: false })
    toast.success('責任者区分を追加しました')
    router.refresh()
  }

  const handleDelete = async (id: string, name: string) => {
    const supabase = createClient()

    // 紐付いているスタッフ数を事前確認（SET NULL 制約なので削除自体は通るが、スタッフの責任者区分がNULLになる）
    const { count } = await supabase
      .from('staff_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('responsible_role_id', id)

    if ((count ?? 0) > 0) {
      const ok = window.confirm(
        `「${name}」には ${count} 名のスタッフが紐付いています。\n削除すると、該当スタッフの責任者区分が未設定になります。\n本当に削除しますか？`
      )
      if (!ok) return
    }

    const { error } = await supabase.from('responsible_roles').delete().eq('id', id)
    if (error) {
      toast.error('削除に失敗しました')
      return
    }
    setRoles(roles.filter((r) => r.id !== id))
    toast.success('削除しました')
    router.refresh()
  }

  const handleUpdate = async (role: ResponsibleRole, field: keyof ResponsibleRole, value: unknown) => {
    if (field === 'can_create_shifts') {
      const msg = value
        ? `「${role.name}」の区分に属するスタッフ全員に管理者権限を付与します。よろしいですか？`
        : `「${role.name}」の区分に属するスタッフ全員の管理者権限をスタッフ権限に戻します。\n自身がこの区分に属している場合、管理者画面にアクセスできなくなります。よろしいですか？`
      if (!window.confirm(msg)) return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('responsible_roles')
      .update({ [field]: value })
      .eq('id', role.id)

    if (updateError) {
      console.error('[handleUpdate] responsible_roles update error:', updateError)
      toast.error(`更新に失敗しました: ${updateError.message}`)
      return
    }

    setRoles(roles.map((r) => r.id === role.id ? { ...r, [field]: value } : r))

    // can_create_shifts が変更されたときは該当スタッフの role を一括更新
    if (field === 'can_create_shifts') {
      const res = await fetch('/api/responsible-roles/sync-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsibleRoleId: role.id, canCreateShifts: value }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(`スタッフ権限の同期に失敗しました: ${json.error ?? res.status}`)
      } else {
        toast.success(`${json.updated}名のスタッフ権限を${value ? '管理者' : 'スタッフ'}に更新しました`)
      }
    }

    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>責任者区分一覧</CardTitle>
          <CardDescription>日中帯・夜間帯への必須配置を設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {roles.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">責任者区分が登録されていません</p>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                  <span className="font-medium flex-1">{role.name}</span>
                  <Switch
                    checked={role.is_active}
                    onCheckedChange={(v) => handleUpdate(role, 'is_active', v)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(role.id, role.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="flex items-center gap-3">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">日中帯への必須配置</div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={role.require_day_zone}
                          onCheckedChange={(v) => handleUpdate(role, 'require_day_zone', v)}
                        />
                        {role.require_day_zone && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={role.require_day_zone_count}
                              onChange={(e) => handleUpdate(role, 'require_day_zone_count', parseInt(e.target.value))}
                              className="w-16 h-7 text-sm"
                            />
                            <span className="text-xs text-gray-500">名以上</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Moon className="h-4 w-4 text-indigo-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">夜間帯への必須配置</div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={role.require_night_zone}
                          onCheckedChange={(v) => handleUpdate(role, 'require_night_zone', v)}
                        />
                        {role.require_night_zone && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={role.require_night_zone_count}
                              onChange={(e) => handleUpdate(role, 'require_night_zone_count', parseInt(e.target.value))}
                              className="w-16 h-7 text-sm"
                            />
                            <span className="text-xs text-gray-500">名以上</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-6">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-0.5">シフト作成権限（admin権限）</div>
                    <div className="text-xs text-gray-500">この区分のスタッフにシフト作成・編集権限を付与する</div>
                  </div>
                  <Switch
                    checked={role.can_create_shifts ?? false}
                    onCheckedChange={(v) => handleUpdate(role, 'can_create_shifts', v)}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            責任者区分を追加
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="例：主任、副主任、夜勤責任者"
              />
            </div>
            <div className="space-y-2">
              <Label>表示色</Label>
              <input
                type="color"
                value={newForm.color}
                onChange={(e) => setNewForm({ ...newForm, color: e.target.value })}
                className="h-10 w-full rounded border cursor-pointer"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" />
                <Label>日中帯への必須配置</Label>
                <Switch
                  checked={newForm.require_day_zone}
                  onCheckedChange={(v) => setNewForm({ ...newForm, require_day_zone: v })}
                />
              </div>
              {newForm.require_day_zone && (
                <div className="flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newForm.require_day_zone_count}
                    onChange={(e) => setNewForm({ ...newForm, require_day_zone_count: parseInt(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">名以上</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-500" />
                <Label>夜間帯への必須配置</Label>
                <Switch
                  checked={newForm.require_night_zone}
                  onCheckedChange={(v) => setNewForm({ ...newForm, require_night_zone: v })}
                />
              </div>
              {newForm.require_night_zone && (
                <div className="flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newForm.require_night_zone_count}
                    onChange={(e) => setNewForm({ ...newForm, require_night_zone_count: parseInt(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">名以上</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <Label>シフト作成権限（admin権限）</Label>
              <Switch
                checked={newForm.can_create_shifts}
                onCheckedChange={(v) => setNewForm({ ...newForm, can_create_shifts: v })}
              />
            </div>
            <p className="text-xs text-gray-500 pl-7">この区分のスタッフにシフト作成・編集権限を付与する</p>
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
