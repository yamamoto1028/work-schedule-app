import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/staff  スタッフ追加（通常 / 仮想）
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  // セッション確認
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminData } = await supabase
    .from('users')
    .select('role, facility_id')
    .eq('id', user.id)
    .single()

  if (adminData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const facilityId = adminData.facility_id!
  const service = createServiceClient()

  const {
    display_name,
    email,
    password,
    is_virtual = false,
    employment_type,
    position,
    responsible_role_id,
    staff_grade = 'full',
    can_night_shift = true,
    phone,
    allowed_shift_type_ids = [],
    block_id,
  } = body as {
    display_name: string
    email?: string
    password?: string
    is_virtual?: boolean
    employment_type?: string
    position?: string
    responsible_role_id?: string
    staff_grade?: 'full' | 'half' | 'new'
    can_night_shift?: boolean
    phone?: string
    allowed_shift_type_ids?: string[]
    block_id?: string
  }

  if (!display_name?.trim()) {
    return NextResponse.json({ error: '氏名は必須です' }, { status: 400 })
  }

  let userId: string

  if (is_virtual) {
    // 仮想スタッフ: Auth アカウント不要。UUID + プレースホルダーメールで DB レコードのみ作成
    const { randomUUID } = await import('crypto')
    userId = randomUUID()
    const virtualEmail = `virtual-${userId}@virtual.internal`

    const { error: userErr } = await service.from('users').insert({
      id: userId,
      facility_id: facilityId,
      email: virtualEmail,
      display_name: display_name.trim(),
      role: 'staff',
      is_virtual: true,
    })

    if (userErr) {
      return NextResponse.json({ error: 'スタッフ情報の保存に失敗しました' }, { status: 500 })
    }
  } else {
    // 通常スタッフ: Supabase Auth アカウントを作成
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードは必須です' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上で入力してください' }, { status: 400 })
    }

    const { data: authData, error: authErr } = await service.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true, // 管理者が作成するためメール確認不要
    })

    if (authErr || !authData.user) {
      const msg = authErr?.message?.includes('already registered')
        ? 'このメールアドレスは既に使用されています'
        : 'アカウントの作成に失敗しました'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    userId = authData.user.id

    const { error: userErr } = await service.from('users').insert({
      id: userId,
      facility_id: facilityId,
      email: email.trim(),
      display_name: display_name.trim(),
      role: 'staff',
      is_virtual: false,
    })

    if (userErr) {
      await service.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'スタッフ情報の保存に失敗しました' }, { status: 500 })
    }
  }

  // staff_profiles 作成
  const { error: profileErr } = await service.from('staff_profiles').insert({
    user_id: userId,
    facility_id: facilityId,
    employment_type: employment_type || null,
    position: position || null,
    responsible_role_id: responsible_role_id || null,
    staff_grade,
    can_night_shift,
    phone: phone || null,
    allowed_shift_type_ids,
    block_id: block_id || null,
  })

  if (profileErr) {
    return NextResponse.json({ error: 'プロフィール作成に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId })
}
