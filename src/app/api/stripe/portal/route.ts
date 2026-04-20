import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

// POST /api/stripe/portal
// Pro ユーザーを Stripe Customer Portal へリダイレクトさせるための URL を返す
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role, facilities(stripe_customer_id, plan)')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const facility = userData.facilities as {
    stripe_customer_id: string | null
    plan: string
  } | null

  if (!facility?.stripe_customer_id) {
    return NextResponse.json({ error: '決済情報が見つかりません' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: facility.stripe_customer_id,
    return_url: `${appUrl}/admin/settings`,
  })

  return NextResponse.json({ url: portalSession.url })
}
