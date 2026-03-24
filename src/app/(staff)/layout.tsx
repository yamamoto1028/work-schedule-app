import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffNav from '@/components/staff-nav'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*, facilities(name, type)')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login?error=setup_required')
  if (userData.role !== 'staff') redirect('/admin/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffNav user={userData} facility={userData.facilities} />
      <main className="ml-56 p-8">
        {children}
      </main>
    </div>
  )
}
