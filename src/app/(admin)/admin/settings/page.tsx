import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ShiftTypesSettings from '@/components/settings/shift-types-settings'
import LeaveTypesSettings from '@/components/settings/leave-types-settings'
import ResponsibleRolesSettings from '@/components/settings/responsible-roles-settings'
import FacilitySettings from '@/components/settings/facility-settings'
import ConstraintSettings from '@/components/settings/constraint-settings'
import ReminderSettings from '@/components/settings/reminder-settings'
import BlocksSettings from '@/components/settings/blocks-settings'
import PlanGate from '@/components/plan-gate'
import { Badge } from '@/components/ui/badge'
import { getAdminSession } from '@/lib/server/session'
import ManagePlanButton from '@/components/billing/manage-plan-button'
import UpgradeButton from '@/components/billing/upgrade-button'
import EnterpriseInquiryButton from '@/components/billing/enterprise-inquiry-button'

export default async function SettingsPage() {
  const [session, supabase] = await Promise.all([getAdminSession(), createClient()])
  if (!session) return null

  const { facilityId } = session

  const [facilityResult, shiftTypesResult, leaveTypesResult, responsibleRolesResult, constraintResult, floorsResult, blocksResult] = await Promise.all([
    supabase.from('facilities').select('*').eq('id', facilityId).single(),
    supabase.from('shift_types').select('*').eq('facility_id', facilityId).order('sort_order'),
    supabase.from('leave_types').select('*').eq('facility_id', facilityId).order('sort_order'),
    supabase.from('responsible_roles').select('*').eq('facility_id', facilityId),
    supabase.from('constraint_settings').select('*').eq('facility_id', facilityId),
    supabase.from('floors').select('*').eq('facility_id', facilityId).order('sort_order'),
    supabase.from('blocks').select('*').eq('facility_id', facilityId).order('sort_order'),
  ])

  const plan = (facilityResult.data?.plan ?? 'free') as 'free' | 'pro' | 'enterprise'
  const isEnterprise = plan === 'enterprise'
  const isPro = plan === 'pro' || plan === 'enterprise'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">施設設定</h1>
            <p className="text-gray-500 mt-1">勤務区分・休暇区分・制約ルール等を設定します</p>
          </div>
          {isPro && (
            <Badge className={`text-white text-xs px-2 py-0.5 shrink-0 ${isEnterprise ? 'bg-violet-600' : 'bg-emerald-600'}`}>
              {isEnterprise ? 'Enterprise' : 'Pro'}
            </Badge>
          )}
        </div>
        {isEnterprise ? (
          <ManagePlanButton />
        ) : isPro ? (
          <div className="flex items-center gap-2">
            <EnterpriseInquiryButton label="Enterpriseへ" />
            <ManagePlanButton />
          </div>
        ) : (
          <UpgradeButton variant="outline" />
        )}
      </div>

      <Tabs defaultValue="shift-types">
        <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full max-w-3xl">
          <TabsTrigger value="facility">施設情報</TabsTrigger>
          <TabsTrigger value="shift-types">勤務区分</TabsTrigger>
          <TabsTrigger value="leave-types">休暇区分</TabsTrigger>
          <TabsTrigger value="responsible-roles">責任者区分</TabsTrigger>
          <TabsTrigger value="constraints">制約設定</TabsTrigger>
          <TabsTrigger value="reminder">督促通知</TabsTrigger>
          <TabsTrigger value="blocks" className="flex items-center gap-1">
            ブロック
            {!isEnterprise && <span className="text-[9px] bg-violet-100 text-violet-700 rounded px-1">Ent</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facility" className="mt-6" keepMounted>
          <FacilitySettings facility={facilityResult.data!} />
        </TabsContent>

        <TabsContent value="shift-types" className="mt-6" keepMounted>
          <ShiftTypesSettings
            facilityId={facilityId}
            shiftTypes={shiftTypesResult.data ?? []}
          />
        </TabsContent>

        <TabsContent value="leave-types" className="mt-6" keepMounted>
          <LeaveTypesSettings
            facilityId={facilityId}
            leaveTypes={leaveTypesResult.data ?? []}
          />
        </TabsContent>

        <TabsContent value="responsible-roles" className="mt-6" keepMounted>
          <ResponsibleRolesSettings
            facilityId={facilityId}
            responsibleRoles={responsibleRolesResult.data ?? []}
          />
        </TabsContent>

        <TabsContent value="constraints" className="mt-6" keepMounted>
          <ConstraintSettings
            facilityId={facilityId}
            constraints={constraintResult.data ?? []}
            responsibleRoles={responsibleRolesResult.data ?? []}
            shiftTypes={shiftTypesResult.data ?? []}
          />
        </TabsContent>

        <TabsContent value="reminder" className="mt-6" keepMounted>
          <ReminderSettings
            facilityId={facilityId}
            initialEnabled={facilityResult.data?.reminder_enabled ?? false}
            initialHourJst={facilityResult.data?.reminder_hour_jst ?? 10}
            initialDeadlineDay={facilityResult.data?.leave_deadline_day ?? null}
            initialMinWishes={facilityResult.data?.leave_min_wishes ?? 2}
          />
        </TabsContent>

        <TabsContent value="blocks" className="mt-6" keepMounted>
          {isEnterprise ? (
            <BlocksSettings
              facilityId={facilityId}
              floors={floorsResult.data ?? []}
              blocks={blocksResult.data ?? []}
            />
          ) : (
            <PlanGate currentPlan={plan} requiredPlan="enterprise" feature="フロア / ブロック管理" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
