import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeaveManagement from '@/components/leave-management-admin'

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

  const { data: leaves, error } = await supabase
    .from('leave_requests')
    .select(`
      id, date, reason, status, created_at,
      users!user_id(id, display_name, email),
      leave_types(name)
    `)
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[LeavesPage] query error:', error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">休暇申請管理</h1>
        <p className="text-gray-500 mt-1">スタッフからの休暇申請を承認・却下します</p>
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          データ取得エラー: {error.message}
        </div>
      )}
      <LeaveManagement leaves={leaves ?? []} />
    </div>
  )
}
