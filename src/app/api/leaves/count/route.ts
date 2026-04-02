import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getMonthRange } from '@/lib/utils'
import { NextResponse } from 'next/server'

// GET /api/leaves/count?facilityId=&leaveTypeId=&yearMonth=YYYY-MM
// RLS を回避してサービスロールで施設全体の承認済み件数を返す
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const facilityId = searchParams.get('facilityId')
  const leaveTypeId = searchParams.get('leaveTypeId')
  const yearMonth = searchParams.get('yearMonth') // YYYY-MM

  if (!facilityId || !leaveTypeId || !yearMonth) {
    return NextResponse.json({ error: 'facilityId, leaveTypeId, yearMonth are required' }, { status: 400 })
  }

  // 認証チェック（ログイン済みであれば OK）
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { start, nextMonthStart } = getMonthRange(yearMonth)

  // サービスロールで RLS をバイパス
  const service = await createServiceClient()

  // leave_type の monthly_limit を取得
  const { data: ltData } = await service
    .from('leave_types')
    .select('monthly_limit')
    .eq('id', leaveTypeId)
    .single()

  const monthlyLimit: number | null = ltData?.monthly_limit ?? null

  // 施設全体の承認済み件数を集計
  const { count, error } = await service
    .from('leave_requests')
    .select('id', { count: 'exact', head: true })
    .eq('facility_id', facilityId)
    .eq('leave_type_id', leaveTypeId)
    .eq('status', 'approved')
    .gte('date', start)
    .lt('date', nextMonthStart)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ count: count ?? 0, limit: monthlyLimit })
}
