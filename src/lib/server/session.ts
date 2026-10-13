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
 * ログイン中のユーザー ID（JWT の sub）。React cache() でリクエスト単位にメモ化する。
 * getClaims() は非対称鍵（JWT Signing Keys）なら手元で署名を検証するため、
 * getUser() と違い Supabase Auth への問い合わせが発生しない（対称鍵の場合は getUser() と同じ動作）。
 */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims.sub ?? null
})

/**
 * React cache() でリクエスト単位にメモ化したセッション取得。
 * layout と page が同一レンダリングツリー内で呼んでも
 * getUser() + DB クエリは 1 回しか実行されない。
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const [userId, supabase] = await Promise.all([getAuthUserId(), createClient()])
  if (!userId) return null

  const { data: userData } = await supabase
    .from('users')
    .select('facility_id, display_name, email, avatar_url, role, facilities(name, type, plan)')
    .eq('id', userId)
    .single()

  if (!userData?.facility_id) return null

  return {
    userId,
    facilityId: userData.facility_id,
    displayName: userData.display_name,
    email: userData.email,
    avatarUrl: userData.avatar_url,
    role: userData.role,
    facility: userData.facilities as { name: string; type: string; plan: string } | null,
  }
})
