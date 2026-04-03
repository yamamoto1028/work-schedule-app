'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'

type Notification = {
  id: string
  type: string
  message: string
  is_read: boolean
  created_at: string
}

const adminTypeRoute: Record<string, string> = {
  shift_published: '/admin/shifts',
  leave_approved: '/admin/leaves',
  leave_rejected: '/admin/leaves',
  leave_requested: '/admin/leaves',
}

const staffTypeRoute: Record<string, string> = {
  shift_published: '/staff/my-shifts',
  leave_approved: '/staff/requests',
  leave_rejected: '/staff/requests',
  leave_requested: '/staff/requests',
}

export default function NotificationBell({ userId, role = 'admin' }: { userId: string; role?: 'admin' | 'staff' }) {
  const typeRoute = role === 'staff' ? staffTypeRoute : adminTypeRoute
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter(n => !n.is_read).length

  // 初期取得
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('notifications')
      .select('id, type, message, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }: { data: Notification[] | null }) => {
        if (data) setNotifications(data)
      })
  }, [userId])

  // Realtime 購読
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification
          setNotifications(prev => [n, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // 外部クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = async () => {
    setOpen(o => !o)
    // 未読を既読にする
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    await createClient().from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const typeLabel: Record<string, string> = {
    shift_published: 'シフト公開',
    leave_approved: '休暇承認',
    leave_rejected: '休暇却下',
    leave_requested: '休暇申請',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-9999 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-800">通知</span>
            {unreadCount === 0 && notifications.length > 0 && (
              <span className="text-xs text-gray-400">すべて既読</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">通知はありません</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => { setOpen(false); router.push(typeRoute[n.type] ?? '/admin/shifts') }}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${n.is_read ? '' : 'bg-emerald-50 hover:bg-emerald-50/70'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                      {typeLabel[n.type] ?? n.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(n.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
