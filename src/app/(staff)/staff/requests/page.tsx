import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import LeaveRequestForm from '@/components/leave-request-form'

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

  const statusLabels: Record<string, string> = {
    pending: '申請中',
    approved: '承認済み',
    rejected: '却下',
  }
  const statusVariants: Record<string, string> = {
    pending: 'secondary',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
  }

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

      <Card>
        <CardHeader>
          <CardTitle>申請履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {(requestsResult.data ?? []).length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">申請履歴がありません</p>
          ) : (
            <div className="space-y-3">
              {(requestsResult.data ?? []).map((req) => {
                const leaveType = req.leave_types as { name: string; color: string } | null
                const date = new Date(req.date)
                const dateLabel = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
                return (
                  <div key={req.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-3 h-8 rounded-full" style={{ backgroundColor: leaveType?.color ?? '#888' }} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{dateLabel}</div>
                      <div className="text-xs text-gray-500">{leaveType?.name}</div>
                      {req.reason && <div className="text-xs text-gray-400 mt-0.5">{req.reason}</div>}
                    </div>
                    <Badge
                      variant={req.status === 'pending' ? 'secondary' : 'outline'}
                      className={req.status !== 'pending' ? statusVariants[req.status] : ''}
                    >
                      {statusLabels[req.status]}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
