import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShiftCalendarPage from '@/components/shift-calendar/shift-calendar-page'

export default async function ShiftsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('facility_id')
    .eq('id', user.id)
    .single()

  const facilityId = userData?.facility_id!

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [staffResult, shiftTypesResult, facilityResult] = await Promise.all([
    supabase
      .from('users')
      .select(`
        id, display_name,
        staff_profiles(
          employment_type, position, can_night_shift, staff_grade,
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
      .select('name, type')
      .eq('id', facilityId)
      .single(),
  ])

  return (
    <ShiftCalendarPage
      facilityId={facilityId}
      initialYear={year}
      initialMonth={month}
      staff={staffResult.data ?? []}
      shiftTypes={shiftTypesResult.data ?? []}
      facilityType={(facilityResult.data?.type ?? 'care_facility') as 'hospital' | 'care_facility'}
    />
  )
}
