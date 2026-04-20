import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

// Webhook は生の body が必要なため Next.js のボディパースを無効化
export const config = { api: { bodyParser: false } }

async function updateFacilityPlan(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  params: {
    customerId?: string
    subscriptionId?: string
    facilityId?: string
    plan: 'free' | 'pro' | 'enterprise'
    subscriptionIdValue?: string | null
  }
) {
  const { customerId, subscriptionId, facilityId, plan, subscriptionIdValue } = params

  const updateData: Record<string, string | null> = { plan }
  if (subscriptionIdValue !== undefined) {
    updateData.stripe_subscription_id = subscriptionIdValue
  }

  // facilityId が metadata にある場合はそれを優先
  if (facilityId) {
    await supabase.from('facilities').update(updateData).eq('id', facilityId)
    return
  }
  // なければ subscription_id で検索
  if (subscriptionId) {
    await supabase.from('facilities').update(updateData).eq('stripe_subscription_id', subscriptionId)
    return
  }
  // 最終手段: customer_id で検索
  if (customerId) {
    await supabase.from('facilities').update(updateData).eq('stripe_customer_id', customerId)
  }
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET が未設定です' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  switch (event.type) {
    // ✅ 決済完了 → Pro / Enterprise に昇格
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const facilityId = session.metadata?.facilityId
      const targetPlan = (session.metadata?.targetPlan ?? 'pro') as 'pro' | 'enterprise'
      const customerId = typeof session.customer === 'string' ? session.customer : undefined
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined

      await updateFacilityPlan(supabase, {
        facilityId,
        customerId,
        plan: targetPlan,
        subscriptionIdValue: subscriptionId ?? null,
      })
      break
    }

    // サブスクリプション更新（支払い失敗・再開 等）
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const facilityId = sub.metadata?.facilityId
      const customerId = typeof sub.customer === 'string' ? sub.customer : undefined

      // active / trialing → Pro / Enterprise を維持。past_due / canceled / unpaid → Free に降格
      const isActive = ['active', 'trialing'].includes(sub.status)
      const targetPlan = (sub.metadata?.targetPlan ?? 'pro') as 'pro' | 'enterprise'
      const plan = isActive ? targetPlan : 'free'
      const subscriptionIdValue = isActive ? sub.id : null

      await updateFacilityPlan(supabase, {
        facilityId,
        subscriptionId: sub.id,
        customerId,
        plan,
        subscriptionIdValue,
      })
      break
    }

    // ✅ 解約完了 → Free に降格
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const facilityId = sub.metadata?.facilityId
      const customerId = typeof sub.customer === 'string' ? sub.customer : undefined

      await updateFacilityPlan(supabase, {
        facilityId,
        subscriptionId: sub.id,
        customerId,
        plan: 'free',
        subscriptionIdValue: null,
      })
      break
    }

    default:
      // 未対応のイベントは無視
      break
  }

  return NextResponse.json({ received: true })
}
