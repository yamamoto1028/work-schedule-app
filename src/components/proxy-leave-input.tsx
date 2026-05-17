'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

type Staff = { id: string; display_name: string }
type LeaveType = { id: string; name: string; color: string }
type ExistingLeave = {
  id: string
  date: string
  user_id: string
  user_name: string
  leave_type_name: string
}

type Props = {
  staff: Staff[]
  leaveTypes: LeaveType[]
  existingProxyLeaves: ExistingLeave[]
}

export default function ProxyLeaveInput({ staff, leaveTypes, existingProxyLeaves }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    target_user_id: '',
    leave_type_id: '',
    date: '',
  })

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.target_user_id || !form.leave_type_id || !form.date) return
    setSubmitting(true)

    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json() as { ok?: boolean; error?: string }

    if (!res.ok) {
      toast.error(json.error ?? '登録に失敗しました')
    } else {
      toast.success('希望休を登録しました')
      setForm(prev => ({ ...prev, date: '' }))
      router.refresh()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    const res = await fetch(`/api/leaves?id=${id}`, { method: 'DELETE' })
    const json = await res.json() as { ok?: boolean; error?: string }
    if (!res.ok) {
      toast.error(json.error ?? '削除に失敗しました')
    } else {
      toast.success('削除しました')
      router.refresh()
    }
    setDeleting(null)
  }

  const selectedStaffName = staff.find(s => s.id === form.target_user_id)?.display_name
  const selectedLeaveTypeName = leaveTypes.find(t => t.id === form.leave_type_id)?.name

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-emerald-600" />
          <div>
            <CardTitle className="text-base">希望休 代理入力</CardTitle>
            <CardDescription>管理者がスタッフの希望休を代理で登録します（自動承認）</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1 min-w-36">
            <Label className="text-xs">スタッフ</Label>
            <Select value={form.target_user_id} onValueChange={v => setForm(prev => ({ ...prev, target_user_id: v ?? '' }))}>
              <SelectTrigger className="h-9 text-sm">
                <span className="truncate">{selectedStaffName ?? 'スタッフを選択'}</span>
              </SelectTrigger>
              <SelectContent>
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 min-w-32">
            <Label className="text-xs">休暇区分</Label>
            <Select value={form.leave_type_id} onValueChange={v => setForm(prev => ({ ...prev, leave_type_id: v ?? '' }))}>
              <SelectTrigger className="h-9 text-sm">
                <span className="truncate">{selectedLeaveTypeName ?? '区分を選択'}</span>
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">日付</Label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
              required
              className="h-9 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 h-9"
            disabled={submitting || !form.target_user_id || !form.leave_type_id || !form.date}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />登録</>}
          </Button>
        </form>

        {existingProxyLeaves.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">日付</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">スタッフ</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">区分</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {existingProxyLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">{leave.date}</td>
                    <td className="px-3 py-2 text-gray-700">{leave.user_name}</td>
                    <td className="px-3 py-2 text-gray-500">{leave.leave_type_name}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDelete(leave.id)}
                        disabled={deleting === leave.id}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        {deleting === leave.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
