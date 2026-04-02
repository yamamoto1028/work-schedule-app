import { createClient } from '@/lib/supabase/server'
import LeaveRequestForm from '@/components/leave-request-form'
import LeaveRequestHistory from '@/components/leave-request-history'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('facility_id')
    .eq('id', user.id)
    .single()

  const facilityId = userData?.facility_id!

  const [leaveTypesResult, requestsResult] = await Promise.all([
    supabase.from('leave_types').select('*').eq('facility_id', facilityId).eq('is_active', true).order('sort_order'),
    supabase
      .from('leave_requests')
      .select('*, leave_types(name, color)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30),
  ])

  const requests = (requestsResult.data ?? []).map(r => ({
    id: r.id,
    date: r.date,
    status: r.status,
    reason: r.reason,
    leave_types: r.leave_types as { name: string; color: string } | null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">休暇申請</h1>
        <p className="text-gray-500 mt-1">休暇の申請・確認ができます</p>
      </div>

      <LeaveRequestForm
        facilityId={facilityId}
        userId={user.id}
        leaveTypes={leaveTypesResult.data ?? []}
      />

      <LeaveRequestHistory requests={requests} />
    </div>
  )
}
