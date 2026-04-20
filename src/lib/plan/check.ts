import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Pro プラン以上であることを確認する。
 * Free プランの場合は 403 レスポンスを返す。
 * Pro / Enterprise の場合は null を返す。
 *
 * 使用例:
 *   const planError = await requireProPlan(facilityId, supabase)
 *   if (planError) return planError
 */
export async function requireProPlan(
  facilityId: string,
  supabase: SupabaseClient<Database>
): Promise<NextResponse | null> {
  const { data } = await supabase
    .from('facilities')
    .select('plan')
    .eq('id', facilityId)
    .single()

  const plan = data?.plan
  if (plan !== 'pro' && plan !== 'enterprise') {
    return NextResponse.json(
      { error: 'この機能は Pro プラン以上でご利用いただけます' },
      { status: 403 }
    )
  }

  return null
}
