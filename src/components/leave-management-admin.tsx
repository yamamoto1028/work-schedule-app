'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Check, X, Loader2 } from 'lucide-react'

type LeaveRequest = {
  id: string
  date: string
  reason: string | null
  status: string
  created_at: string
  users: { id: string; display_name: string; email: string } | null
  leave_types: { name: string } | null
}

type Props = {
  leaves: LeaveRequest[]
}

const STATUS_FILTER = ['all', 'pending', 'approved', 'rejected'] as const
const STATUS_LABEL: Record<string, string> = {
  pending: '未承認',
  approved: '承認済',
  rejected: '却下',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
}

export default function LeaveManagement({ leaves: initialLeaves }: Props) {
  const router = useRouter()
  const [leaves, setLeaves] = useState(initialLeaves)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setProcessing(id)
    try {
      const res = await fetch('/api/leaves', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error()
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l))
      toast.success(status === 'approved' ? '承認しました' : '却下しました')
      router.refresh()
    } catch {
      toast.error('処理に失敗しました')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = filter === 'all' ? leaves : leaves.filter(l => l.status === filter)
  const pendingCount = leaves.filter(l => l.status === 'pending').length

  return (
    <div className="space-y-4">
      {/* フィルタータブ */}
      <div className="flex gap-2">
        {STATUS_FILTER.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'すべて' : STATUS_LABEL[f]}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* 申請一覧 */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            {filter === 'pending' ? '未承認の申請はありません' : '該当する申請がありません'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(leave => (
            <Card key={leave.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* スタッフ名 */}
                  <div className="w-28 shrink-0">
                    <div className="text-sm font-medium text-gray-900">{leave.users?.display_name ?? '—'}</div>
                    <div className="text-xs text-gray-400 truncate">{leave.users?.email}</div>
                  </div>

                  {/* 日付 */}
                  <div className="w-28 shrink-0">
                    <div className="text-sm font-semibold text-gray-800">{leave.date}</div>
                    <div className="text-xs text-gray-500">{leave.leave_types?.name ?? '休暇'}</div>
                  </div>

                  {/* 理由 */}
                  <div className="flex-1 text-sm text-gray-600 truncate">
                    {leave.reason ?? <span className="text-gray-300">理由なし</span>}
                  </div>

                  {/* ステータス */}
                  <Badge className={`shrink-0 border text-xs ${STATUS_COLOR[leave.status] ?? ''}`} variant="outline">
                    {STATUS_LABEL[leave.status] ?? leave.status}
                  </Badge>

                  {/* アクション */}
                  {leave.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleAction(leave.id, 'approved')}
                        disabled={processing === leave.id}
                        className="bg-emerald-600 hover:bg-emerald-700 h-8 gap-1"
                      >
                        {processing === leave.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        承認
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(leave.id, 'rejected')}
                        disabled={processing === leave.id}
                        className="text-red-600 border-red-200 hover:bg-red-50 h-8 gap-1"
                      >
                        {processing === leave.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        却下
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
