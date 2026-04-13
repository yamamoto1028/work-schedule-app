import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShiftCalendarPage from '@/components/shift-calendar/shift-calendar-page'
import { getAdminSession } from '@/lib/server/session'

export default async function ShiftsPage() {
  const [session, supabase] = await Promise.all([getAdminSession(), createClient()])
  if (!session) redirect('/login')

  const { facilityId } = session

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [staffResult, shiftTypesResult, facilityResult, floorsResult, blocksResult] = await Promise.all([
    supabase
      .from('users')
      .select(`
        id, display_name,
        staff_profiles(
          employment_type, position, can_night_shift, staff_grade,
          allowed_shift_type_ids, block_id,
          responsible_roles(name, color)
        )
      `)
      .eq('facility_id', facilityId)
      .eq('role', 'staff')
      .eq('is_active', true)
      .order('created_at'),
    supabase
      .from('shift_types')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('facilities')
      .select('name, type, plan')
      .eq('id', facilityId)
      .single(),
    supabase
      .from('floors')
      .select('id, name, sort_order')
      .eq('facility_id', facilityId)
      .order('sort_order'),
    supabase
      .from('blocks')
      .select('id, floor_id, name, color, sort_order')
      .eq('facility_id', facilityId)
      .order('sort_order'),
  ])

  return (
    <ShiftCalendarPage
      facilityId={facilityId}
      initialYear={year}
      initialMonth={month}
      staff={staffResult.data ?? []}
      shiftTypes={shiftTypesResult.data ?? []}
      facilityType={(facilityResult.data?.type ?? 'care_facility') as 'hospital' | 'care_facility'}
      plan={(facilityResult.data?.plan ?? 'free') as 'free' | 'pro' | 'enterprise'}
      floors={floorsResult.data ?? []}
      blocks={blocksResult.data ?? []}
    />
  )
}
