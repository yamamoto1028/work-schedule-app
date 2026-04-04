import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeaveManagement from '@/components/leave-management-admin'
import LeaveWishReminderPanel from '@/components/leave-wish-reminder-panel'

export default async function LeavesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role, facility_id')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') redirect('/staff/my-shifts')

  const facilityId = userData.facility_id!

  // 来月の年月を計算
  const now = new Date()
  const targetMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2
  const targetYear  = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear()
  const monthStr  = `${targetYear}-${String(targetMonth).padStart(2, '0')}`
  const startDate = `${monthStr}-01`
  const lastDay   = new Date(targetYear, targetMonth, 0).getDate()
  const endDate   = `${monthStr}-${String(lastDay).padStart(2, '0')}`

  const [leavesResult, facilityResult, staffResult, wishTypesResult] = await Promise.all([
    supabase
      .from('leave_requests')
      .select(`
        id, date, reason, status, created_at,
        users!user_id(id, display_name, email),
        leave_types(name)
      `)
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false })
      .limit(200),

    supabase
      .from('facilities')
      .select('leave_deadline_day, leave_min_wishes')
      .eq('id', facilityId)
      .single(),

    supabase
      .from('users')
      .select('id, display_name')
      .eq('facility_id', facilityId)
      .eq('role', 'staff')
      .eq('is_active', true),

    supabase
      .from('leave_types')
      .select('id')
      .eq('facility_id', facilityId)
      .eq('is_wish', true),
  ])

  const minWishes   = facilityResult.data?.leave_min_wishes   ?? 2
  const deadlineDay = facilityResult.data?.leave_deadline_day ?? null
  const wishTypeIds = (wishTypesResult.data ?? []).map(t => t.id)
  const allStaff    = staffResult.data ?? []

  // スタッフ別の希望休提出数を集計
  const submittedCountMap = new Map<string, number>()
  if (wishTypeIds.length > 0) {
    const { data: wishRequests } = await supabase
      .from('leave_requests')
      .select('user_id')
      .eq('facility_id', facilityId)
      .in('leave_type_id', wishTypeIds)
      .in('status', ['pending', 'approved'])
      .gte('date', startDate)
      .lte('date', endDate)

    for (const req of wishRequests ?? []) {
      submittedCountMap.set(req.user_id, (submittedCountMap.get(req.user_id) ?? 0) + 1)
    }
  }

  const unsubmittedStaff = allStaff
    .map(s => ({ id: s.id, display_name: s.display_name, submittedCount: submittedCountMap.get(s.id) ?? 0 }))
    .filter(s => s.submittedCount < minWishes)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">休暇申請管理</h1>
        <p className="text-gray-500 mt-1">スタッフからの休暇申請を承認・却下します</p>
      </div>

      {/* 希望休督促パネル */}
      <LeaveWishReminderPanel
        facilityId={facilityId}
        targetYear={targetYear}
        targetMonth={targetMonth}
        deadlineDay={deadlineDay}
        minWishes={minWishes}
        unsubmittedStaff={unsubmittedStaff}
      />

      {leavesResult.error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          データ取得エラー: {leavesResult.error.message}
        </div>
      )}
      <LeaveManagement leaves={leavesResult.data ?? []} />
    </div>
  )
}
