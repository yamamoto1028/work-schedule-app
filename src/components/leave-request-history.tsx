'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'

type LeaveRequest = {
  id: string
  date: string
  status: string
  reason: string | null
  leave_types: { name: string; color: string } | null
}

type Props = {
  requests: LeaveRequest[]
}

const STATUS_LABEL: Record<string, string> = {
  pending: '申請中',
  approved: '承認済み',
  rejected: '却下',
}
const STATUS_CLASS: Record<string, string> = {
  pending: '',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default function LeaveRequestHistory({ requests: initialRequests }: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  const handleWithdraw = async (id: string, date: string) => {
    if (!window.confirm(`${date} の申請を取り下げますか？`)) return
    setWithdrawing(id)
    const supabase = createClient()
    const { error } = await supabase.from('leave_requests').delete().eq('id', id)
    if (error) {
      toast.error('取り下げに失敗しました')
    } else {
      setRequests(prev => prev.filter(r => r.id !== id))
      toast.success('申請を取り下げました')
      router.refresh()
    }
    setWithdrawing(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>申請履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">申請履歴がありません</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const d = new Date(req.date)
              const dateLabel = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
              return (
                <div key={req.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-3 h-8 rounded-full shrink-0" style={{ backgroundColor: req.leave_types?.color ?? '#888' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{dateLabel}</div>
                    <div className="text-xs text-gray-500">{req.leave_types?.name}</div>
                    {req.reason && <div className="text-xs text-gray-400 mt-0.5 truncate">{req.reason}</div>}
                  </div>
                  <Badge
                    variant={req.status === 'pending' ? 'secondary' : 'outline'}
                    className={`shrink-0 ${STATUS_CLASS[req.status] ?? ''}`}
                  >
                    {STATUS_LABEL[req.status] ?? req.status}
                  </Badge>
                  {req.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                      disabled={withdrawing === req.id}
                      onClick={() => handleWithdraw(req.id, dateLabel)}
                    >
                      {withdrawing === req.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />}
                      取り下げ
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
