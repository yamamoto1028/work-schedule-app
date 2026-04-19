'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Trash2, Lock } from 'lucide-react'

type LeaveType = {
  id: string
  key: string
  name: string
  color: string
  is_default: boolean
  is_active: boolean
  sort_order: number
  monthly_limit: number | null
}

type Props = {
  facilityId: string
  leaveTypes: LeaveType[]
}

export default function LeaveTypesSettings({ facilityId, leaveTypes: initialTypes }: Props) {
  const router = useRouter()
  const [leaveTypes, setLeaveTypes] = useState(initialTypes)
  const [newForm, setNewForm] = useState({ name: '', color: '#888888' })

  // サーバー再フェッチ後に最新データを反映
  useEffect(() => {
    setLeaveTypes(initialTypes)
  }, [initialTypes])

  const handleAdd = async () => {
    if (!newForm.name) {
      toast.error('名称は必須です')
      return
    }
    const key = `custom_${Date.now()}`
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leave_types')
      .insert({
        facility_id: facilityId,
        key,
        name: newForm.name,
        color: newForm.color,
        is_default: false,
        sort_order: leaveTypes.length,
      })
      .select()
      .single()

    if (error) {
      toast.error('追加に失敗しました')
      return
    }
    setLeaveTypes([...leaveTypes, { ...data, monthly_limit: null }])
    setNewForm({ name: '', color: '#888888' })
    toast.success('休暇区分を追加しました')
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('leave_types').delete().eq('id', id)
    if (error) {
      toast.error('削除できません。この休暇区分には申請実績があります。削除の代わりに無効化をご利用ください。')
      return
    }
    setLeaveTypes(leaveTypes.filter((t) => t.id !== id))
    toast.success('削除しました')
    router.refresh()
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('leave_types').update({ is_active: !current }).eq('id', id)
    setLeaveTypes(leaveTypes.map((t) => t.id === id ? { ...t, is_active: !current } : t))
    router.refresh()
  }

  const handleUpdateLimit = async (id: string) => {
    const lt = leaveTypes.find(t => t.id === id)
    if (!lt) return
    const limit = lt.monthly_limit
    if (limit !== null && (isNaN(limit) || limit < 1)) {
      toast.error('1以上の数値を入力してください')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from('leave_types').update({ monthly_limit: limit }).eq('id', id)
    if (error) {
      toast.error('更新に失敗しました')
      return
    }
    toast.success('月上限数を保存しました')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>休暇区分一覧</CardTitle>
          <CardDescription>
            <Lock className="h-3.5 w-3.5 inline mr-1" />
            アイコン付きはデフォルト区分（削除不可）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaveTypes.map((lt) => (
            <div key={lt.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
              <div
                className="w-3 h-10 rounded-full shrink-0"
                style={{ backgroundColor: lt.color }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{lt.name}</span>
                  {lt.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="h-3 w-3 mr-1" />デフォルト
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-400">{lt.key}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-gray-500 whitespace-nowrap">月上限</span>
                <Input
                  type="number"
                  min={1}
                  value={lt.monthly_limit ?? ''}
                  onChange={(e) => setLeaveTypes(prev => prev.map(t =>
                    t.id === lt.id ? { ...t, monthly_limit: e.target.value === '' ? null : parseInt(e.target.value, 10) } : t
                  ))}
                  placeholder="無制限"
                  className="w-20 h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-2 shrink-0"
                  onClick={() => handleUpdateLimit(lt.id)}
                >
                  保存
                </Button>
              </div>
              <Switch
                checked={lt.is_active}
                onCheckedChange={() => handleToggleActive(lt.id, lt.is_active)}
              />
              {!lt.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(lt.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            施設独自の休暇区分を追加
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="例：リフレッシュ休暇"
              />
            </div>
            <div className="space-y-2">
              <Label>表示色</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newForm.color}
                  onChange={(e) => setNewForm({ ...newForm, color: e.target.value })}
                  className="h-10 w-16 rounded border cursor-pointer"
                />
                <span className="text-sm text-gray-500">{newForm.color}</span>
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
