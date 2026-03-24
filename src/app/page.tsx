import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const result = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = (result.data as { role: string } | null)?.role

  // ロール取得失敗時はデフォルトでadminダッシュボードへ（layoutで再チェック）
  if (role === 'staff') {
    redirect('/staff/my-shifts')
  } else {
    redirect('/admin/dashboard')
  }
}
