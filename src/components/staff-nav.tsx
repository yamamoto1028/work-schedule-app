'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar, ClipboardList, LogOut, Building2, ArrowLeftRight } from 'lucide-react'

const navItems = [
  { href: '/staff/my-shifts', label: '自分のシフト', icon: Calendar },
  { href: '/staff/requests', label: '休暇申請', icon: ClipboardList },
]

type StaffNavProps = {
  user: {
    display_name: string
    email: string
    avatar_url: string | null
  }
  facility: {
    name: string
    type: string
  } | null
  isAdmin?: boolean
}

export default function StaffNav({ user, facility, isAdmin = false }: StaffNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-sm font-bold">
            よ
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">YOMOGI</div>
            <div className="text-xs text-gray-400">スタッフ</div>
          </div>
        </div>
      </div>

      {facility && (
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="truncate text-xs">{facility.name}</span>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* 管理者は管理画面へのリンクを表示 */}
      {isAdmin && (
        <div className="px-4 py-2 border-t border-gray-700">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ArrowLeftRight className="h-4 w-4 shrink-0" />
            管理者画面へ
          </Link>
        </div>
      )}

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-700 text-gray-200 text-xs">
              {user.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.display_name}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          ログアウト
        </Button>
      </div>
    </aside>
  )
}
