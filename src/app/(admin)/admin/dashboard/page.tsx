import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, ClipboardList, Bell } from 'lucide-react'
import Link from 'next/link'
import { getAdminSession } from '@/lib/server/session'

export default async function DashboardPage() {
  const [session, supabase] = await Promise.all([getAdminSession(), createClient()])
  if (!session) return null

  const { facilityId } = session

  // 並列でデータ取得
  const [staffResult, pendingLeaveResult, shiftsResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact' }).eq('facility_id', facilityId!).eq('is_active', true).eq('role', 'staff'),
    supabase.from('leave_requests').select('id', { count: 'exact' }).eq('facility_id', facilityId!).eq('status', 'pending'),
    supabase.from('shifts').select('id', { count: 'exact' }).eq('facility_id', facilityId!).eq('status', 'draft'),
  ])

  const now = new Date()
  const currentMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">
          {session.facility?.name} | {currentMonth}
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">スタッフ数</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffResult.count ?? 0}<span className="text-sm font-normal text-gray-500 ml-1">名</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">休暇申請（未承認）</CardTitle>
            <ClipboardList className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{pendingLeaveResult.count ?? 0}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div>
              {(pendingLeaveResult.count ?? 0) > 0 && (
                <Badge variant="destructive" className="text-xs">要確認</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">下書きシフト</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shiftsResult.count ?? 0}<span className="text-sm font-normal text-gray-500 ml-1">件</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">通知</CardTitle>
            <Bell className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0<span className="text-sm font-normal text-gray-500 ml-1">件</span></div>
          </CardContent>
        </Card>
      </div>

      {/* クイックアクション */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/shifts">
            <Card className="hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold">シフト作成・管理</div>
                  <div className="text-sm text-gray-500">AIでシフトを自動生成</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/staff">
            <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">スタッフ管理</div>
                  <div className="text-sm text-gray-500">スタッフの追加・編集</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:border-purple-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold">施設設定</div>
                  <div className="text-sm text-gray-500">勤務区分・制約設定</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ヨモギ主任からひとこと */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              主
            </div>
            <div>
              <div className="font-semibold text-amber-800 mb-1">ヨモギ主任より</div>
              <p className="text-amber-700 text-sm leading-relaxed">
                まあ、ログインできたんじゃけん、最初の一歩はよかったのぉ。<br />
                シフト設定をきっちりしてから、AI生成を使うてみんさい。ほいじゃけん、まず設定画面から始めんさいよ。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
