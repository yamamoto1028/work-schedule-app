import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ShiftTypesSettings from '@/components/settings/shift-types-settings'
import LeaveTypesSettings from '@/components/settings/leave-types-settings'
import ResponsibleRolesSettings from '@/components/settings/responsible-roles-settings'
import FacilitySettings from '@/components/settings/facility-settings'
import ConstraintSettings from '@/components/settings/constraint-settings'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('facility_id')
    .eq('id', user.id)
    .single()

  const facilityId = userData?.facility_id!

  const [facilityResult, shiftTypesResult, leaveTypesResult, responsibleRolesResult, constraintResult] = await Promise.all([
    supabase.from('facilities').select('*').eq('id', facilityId).single(),
    supabase.from('shift_types').select('*').eq('facility_id', facilityId).order('sort_order'),
    supabase.from('leave_types').select('*').eq('facility_id', facilityId).order('sort_order'),
    supabase.from('responsible_roles').select('*').eq('facility_id', facilityId),
    supabase.from('constraint_settings').select('*').eq('facility_id', facilityId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">施設設定</h1>
        <p className="text-gray-500 mt-1">勤務区分・休暇区分・制約ルール等を設定します</p>
      </div>

      <Tabs defaultValue="shift-types">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="facility">施設情報</TabsTrigger>
          <TabsTrigger value="shift-types">勤務区分</TabsTrigger>
          <TabsTrigger value="leave-types">休暇区分</TabsTrigger>
          <TabsTrigger value="responsible-roles">責任者区分</TabsTrigger>
          <TabsTrigger value="constraints">制約設定</TabsTrigger>
        </TabsList>

        <TabsContent value="facility" className="mt-6">
          <FacilitySettings facility={facilityResult.data!} />
        </TabsContent>

        <TabsContent value="shift-types" className="mt-6">
          <ShiftTypesSettings
            facilityId={facilityId}
            shiftTypes={shiftTypesResult.data ?? []}
          />
        </TabsContent>

        <TabsContent value="leave-types" className="mt-6">
          <LeaveTypesSettings
            facilityId={facilityId}
            leaveTypes={leaveTypesResult.data ?? []}
          />
        </TabsContent>

        <TabsContent value="responsible-roles" className="mt-6">
          <ResponsibleRolesSettings
            facilityId={facilityId}
            responsibleRoles={responsibleRolesResult.data ?? []}
          />
        </TabsContent>

        <TabsContent value="constraints" className="mt-6">
          <ConstraintSettings
            facilityId={facilityId}
            constraints={constraintResult.data ?? []}
            responsibleRoles={responsibleRolesResult.data ?? []}
            shiftTypes={shiftTypesResult.data ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
