import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type AdminSession = {
  userId: string
  facilityId: string
  displayName: string
  email: string
  avatarUrl: string | null
  role: string
  facility: { name: string; type: string; plan: string } | null
}

/**
 * React cache() でリクエスト単位にメモ化したセッション取得。
 * layout と page が同一レンダリングツリー内で呼んでも
 * getUser() + DB クエリは 1 回しか実行されない。
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('facility_id, display_name, email, avatar_url, role, facilities(name, type, plan)')
    .eq('id', user.id)
    .single()

  if (!userData?.facility_id) return null

  return {
    userId: user.id,
    facilityId: userData.facility_id,
    displayName: userData.display_name,
    email: userData.email,
    avatarUrl: userData.avatar_url,
    role: userData.role,
    facility: userData.facilities as { name: string; type: string; plan: string } | null,
  }
})
