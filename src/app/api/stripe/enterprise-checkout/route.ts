import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { calcEnterpriseMonthlyTotal } from '@/lib/stripe/pricing'

type Body = {
  blockCount: number
}

// POST /api/stripe/enterprise-checkout
// body: { blockCount: number }
export async function POST(req: Request) {
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

  if (facility.plan === 'enterprise') {
    return NextResponse.json({ error: 'すでに Enterprise プランです' }, { status: 400 })
  }

  const body = await req.json() as Body
  const blockCount = Math.max(2, Math.floor(body.blockCount ?? 2))

  const productId = process.env.STRIPE_ENTERPRISE_PRODUCT_ID
  if (!productId) {
    return NextResponse.json({ error: 'STRIPE_ENTERPRISE_PRODUCT_ID が未設定です' }, { status: 500 })
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

    await supabase
      .from('facilities')
      .update({ stripe_customer_id: customerId })
      .eq('id', facilityId)
  }

  // ブロック数に応じた月額合計を計算し、合計金額をそのまま Stripe に渡す
  // quantity: blockCount で割り算するとJPY端数が生じるため quantity: 1 で合計額を渡す
  const monthlyTotal = calcEnterpriseMonthlyTotal(blockCount)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: 'jpy',
        unit_amount: monthlyTotal,
        recurring: { interval: 'month' },
        product: productId,
      },
      quantity: 1,
    }],
    metadata: { facilityId, targetPlan: 'enterprise', blockCount: String(blockCount) },
    subscription_data: {
      metadata: { facilityId, targetPlan: 'enterprise', blockCount: String(blockCount) },
    },
    success_url: `${appUrl}/admin/dashboard?checkout=success`,
    cancel_url:  `${appUrl}/admin/settings`,
    locale: 'ja',
    tax_id_collection: { enabled: false },
  })

  return NextResponse.json({ url: session.url })
}
