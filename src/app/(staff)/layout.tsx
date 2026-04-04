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
  // admin も自分のシフト確認・休暇申請のためにスタッフ画面にアクセス可能
  if (userData.role !== 'staff' && userData.role !== 'admin') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffNav user={userData} facility={userData.facilities} isAdmin={userData.role === 'admin'} />
      <main className="md:ml-56 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
