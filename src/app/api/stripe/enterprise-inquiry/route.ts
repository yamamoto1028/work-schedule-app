import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEnterpriseInquiryToAdmin, sendEnterpriseInquiryAck } from '@/lib/email'

type InquiryBody = {
  floorCount: number
  blockCount: number
  message: string
}

// POST /api/stripe/enterprise-inquiry
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role, display_name, email, facilities(name)')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const facility = userData.facilities as { name: string } | null
  if (!facility) {
    return NextResponse.json({ error: '施設情報が見つかりません' }, { status: 400 })
  }

  const body = await req.json() as InquiryBody
  const { floorCount, blockCount, message } = body

  if (!floorCount || !blockCount) {
    return NextResponse.json({ error: 'フロア数・ブロック数は必須です' }, { status: 400 })
  }

  const contactName = userData.display_name ?? '（未設定）'
  const contactEmail = userData.email

  await Promise.allSettled([
    sendEnterpriseInquiryToAdmin({
      facilityName: facility.name,
      contactName,
      contactEmail,
      floorCount,
      blockCount,
      message: message ?? '',
    }),
    sendEnterpriseInquiryAck({
      contactName,
      contactEmail,
      facilityName: facility.name,
    }),
  ])

  return NextResponse.json({ ok: true })
}
