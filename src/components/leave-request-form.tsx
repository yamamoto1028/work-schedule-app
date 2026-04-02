'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

type LeaveType = {
  id: string
  name: string
  color: string
  monthly_limit: number | null
}

type Props = {
  facilityId: string
  userId: string
  leaveTypes: LeaveType[]
}

export default function LeaveRequestForm({ facilityId, userId, leaveTypes }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState<Date | undefined>()
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!date || !leaveTypeId) {
      toast.error('日付と休暇区分は必須です')
      return
    }
    const selectedType = leaveTypes.find(lt => lt.id === leaveTypeId)
    const leaveTypeName = selectedType?.name ?? '選択中の区分'
    const dateLabel = format(date, 'yyyy年M月d日', { locale: ja })

    // 月上限チェック（DB から直接取得し RLS をバイパス）
    const yearMonth = format(date, 'yyyy-MM')
    try {
      const limitRes = await fetch(
        `/api/leaves/count?facilityId=${facilityId}&leaveTypeId=${leaveTypeId}&yearMonth=${yearMonth}`
      )
      const { count, limit } = await limitRes.json() as { count: number; limit: number | null }
      if (limit !== null && count >= limit) {
        window.alert(`${leaveTypeName} は今月の承認上限（${limit}件）に達しているため申請できません。`)
        return
      }
    } catch {
      window.alert('上限チェックに失敗しました。再度お試しください。')
      return
    }

    if (!window.confirm(`${dateLabel}（${leaveTypeName}）で休暇申請を送信しますか？`)) return
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('leave_requests').insert({
      facility_id: facilityId,
      user_id: userId,
      leave_type_id: leaveTypeId,
      date: format(date, 'yyyy-MM-dd'),
      reason: reason || null,
    })

    if (error) {
      toast.error('申請に失敗しました')
    } else {
      toast.success('休暇申請を送信しました')
      setDate(undefined)
      setLeaveTypeId('')
      setReason('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規申請</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>日付 *</Label>
            <Popover>
              <PopoverTrigger
                className="flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
              >
                <CalendarIcon className="h-4 w-4 opacity-50" />
                {date ? format(date, 'yyyy年M月d日', { locale: ja }) : <span className="text-muted-foreground">日付を選択</span>}
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ja}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>休暇区分 *</Label>
            <Select value={leaveTypeId} onValueChange={(v) => setLeaveTypeId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="区分を選択" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lt.color }} />
                      {lt.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>理由（任意）</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="申請理由があれば記入してください"
              rows={3}
            />
          </div>

          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            申請する
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
