import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

// POST /api/stripe/checkout
export async function POST(_req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role, facility_id, display_name, email, facilities(name, stripe_customer_id, plan)')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const facilityId = userData.facility_id
  const facility = userData.facilities as {
    name: string
    stripe_customer_id: string | null
    plan: string
  } | null

  if (!facility || !facilityId) {
    return NextResponse.json({ error: 'facility not found' }, { status: 400 })
  }

  if (facility.plan === 'pro' || facility.plan === 'enterprise') {
    return NextResponse.json({ error: 'すでに有料プランです' }, { status: 400 })
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) {
    return NextResponse.json({ error: 'STRIPE_PRO_PRICE_ID が未設定です' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // 既存の Stripe Customer を再利用、なければ作成
  let customerId = facility.stripe_customer_id ?? undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: facility.name,
      metadata: { facilityId, userId: user.id },
    })
    customerId = customer.id

    // customer_id を即時保存（Webhook 到着前に Portal でも使えるように）
    await supabase
      .from('facilities')
      .update({ stripe_customer_id: customerId })
      .eq('id', facilityId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { facilityId, targetPlan: 'pro' },
    subscription_data: { metadata: { facilityId, targetPlan: 'pro' } },
    success_url: `${appUrl}/admin/dashboard?checkout=success`,
    cancel_url: `${appUrl}/admin/dashboard?checkout=cancelled`,
    locale: 'ja',
    tax_id_collection: { enabled: false },
  })

  return NextResponse.json({ url: session.url })
}
