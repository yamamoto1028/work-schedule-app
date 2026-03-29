import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*, facilities(*)')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login?error=setup_required')
  if (userData.role !== 'admin') redirect('/staff/my-shifts')

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav user={userData} facility={userData.facilities} />
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  )
}
