import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// POST /api/responsible-roles/sync-admin
// body: { responsibleRoleId: string, canCreateShifts: boolean }
// can_create_shifts が変更されたとき、その区分に属する全スタッフの users.role を一括更新する
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role, facility_id')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { responsibleRoleId, canCreateShifts } = await req.json() as {
    responsibleRoleId: string
    canCreateShifts: boolean
  }

  // その responsible_role に属するスタッフの user_id を取得
  const { data: profiles, error: profilesError } = await supabase
    .from('staff_profiles')
    .select('user_id')
    .eq('responsible_role_id', responsibleRoleId)

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })
  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  const userIds = profiles.map(p => p.user_id).filter(Boolean) as string[]
  const newRole = canCreateShifts ? 'admin' : 'staff'

  // @supabase/supabase-js で直接 service role クライアントを作成して RLS をバイパス
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: updated, error: updateError } = await admin
    .from('users')
    .update({ role: newRole })
    .in('id', userIds)
    .select('id, role')

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ updated: updated?.length ?? 0 })
}
