import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin-nav'
import { getAdminSession } from '@/lib/server/session'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (!session) redirect('/login?error=setup_required')
  if (session.role !== 'admin') redirect('/staff/my-shifts')

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav
        user={{ id: session.userId, display_name: session.displayName, email: session.email, avatar_url: session.avatarUrl }}
        facility={session.facility}
      />
      <main className="md:ml-64 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
