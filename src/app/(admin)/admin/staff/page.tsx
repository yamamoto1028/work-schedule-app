import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import StaffTable from '@/components/staff/staff-table'
import StaffCreateDialog from '@/components/staff/staff-create-dialog'

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('facility_id')
    .eq('id', user.id)
    .single()

  if (!userData?.facility_id) return null
  const facilityId = userData.facility_id

  const [staffResult, responsibleRolesResult, shiftTypesResult] = await Promise.all([
    supabase
      .from('users')
      .select(`
        *,
        staff_profiles(
          *,
          responsible_roles(name, color)
        )
      `)
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: true }),
    supabase
      .from('responsible_roles')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('is_active', true),
    supabase
      .from('shift_types')
      .select('id, name, short_name')
      .eq('facility_id', facilityId)
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">スタッフ管理</h1>
          <p className="text-gray-500 mt-1">
            スタッフの追加・編集・管理を行います
          </p>
        </div>
        <StaffCreateDialog
          facilityId={facilityId}
          responsibleRoles={responsibleRolesResult.data ?? []}
          shiftTypes={shiftTypesResult.data ?? []}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <StaffTable
            staff={staffResult.data ?? []}
            facilityId={facilityId}
            responsibleRoles={responsibleRolesResult.data ?? []}
            shiftTypes={shiftTypesResult.data ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
