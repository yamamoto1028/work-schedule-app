import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_SHIFT_TYPES = {
  care_facility: [
    { name: '早番', short_name: '早', color: '#4DB6AC', start_time: '07:00', end_time: '16:00', time_zone: 'day' as const, sort_order: 1 },
    { name: '日勤', short_name: '日', color: '#4472C4', start_time: '09:00', end_time: '18:00', time_zone: 'day' as const, sort_order: 2 },
    { name: '遅番', short_name: '遅', color: '#7E57C2', start_time: '11:00', end_time: '20:00', time_zone: 'day' as const, sort_order: 3 },
    { name: '夜勤', short_name: '夜', color: '#1565C0', start_time: '16:45', end_time: '09:15', time_zone: 'night' as const, sort_order: 4 },
    { name: '明け', short_name: '明', color: '#90A4AE', start_time: '09:15', end_time: '10:00', time_zone: 'night' as const, sort_order: 5 },
  ],
  hospital: [
    { name: '早番', short_name: '早', color: '#4DB6AC', start_time: '07:00', end_time: '16:00', time_zone: 'day' as const, sort_order: 1 },
    { name: '日勤', short_name: '日', color: '#4472C4', start_time: '08:30', end_time: '17:30', time_zone: 'day' as const, sort_order: 2 },
    { name: '遅番', short_name: '遅', color: '#7E57C2', start_time: '11:00', end_time: '20:00', time_zone: 'day' as const, sort_order: 3 },
    { name: '夜勤', short_name: '夜', color: '#1565C0', start_time: '16:45', end_time: '09:15', time_zone: 'night' as const, sort_order: 4 },
    { name: '明け', short_name: '明', color: '#90A4AE', start_time: '09:15', end_time: '10:00', time_zone: 'night' as const, sort_order: 5 },
  ],
}

const DEFAULT_LEAVE_TYPES = [
  { key: 'desired_off', name: '希望休', color: '#888888', is_default: true, is_wish: true, sort_order: 1 },
  { key: 'paid_holiday', name: '有給休暇', color: '#4CAF50', is_default: true, is_wish: false, sort_order: 2 },
  { key: 'maternity_leave', name: '産前産後休暇', color: '#E91E63', is_default: true, is_wish: false, sort_order: 3 },
  { key: 'childcare_leave', name: '育児休業', color: '#FF9800', is_default: true, is_wish: false, sort_order: 4 },
]

const DEFAULT_CONSTRAINTS = [
  { constraint_key: 'rest_after_night_off', is_enabled: true, value: {} },
  { constraint_key: 'no_day_shift_after_night', is_enabled: true, value: {} },
  { constraint_key: 'max_consecutive_day_only', is_enabled: true, value: { days: 3 } },
  { constraint_key: 'max_consecutive_with_night', is_enabled: true, value: { days: 4 } },
  { constraint_key: 'max_consecutive_days', is_enabled: true, value: { days: 5 } },
  { constraint_key: 'min_days_off_per_month', is_enabled: true, value: { days: 8 } },
  { constraint_key: 'min_weekly_days_off', is_enabled: true, value: { days: 2 } },
  { constraint_key: 'max_monthly_shifts', is_enabled: true, value: { shifts: 22 } },
  { constraint_key: 'night_shift_equal_distribution', is_enabled: true, value: {} },
  { constraint_key: 'max_night_shifts_per_month', is_enabled: true, value: { count: 8 } },
  { constraint_key: 'require_skill_match', is_enabled: true, value: {} },
  { constraint_key: 'half_staff_isolation', is_enabled: true, value: {} },
]

const DEFAULT_RESPONSIBLE_ROLES = {
  care_facility: { name: 'ユニットリーダー', color: '#E25822', require_day_zone: true, require_day_zone_count: 1, require_night_zone: false, require_night_zone_count: 1 },
  hospital: { name: '師長', color: '#D32F2F', require_day_zone: true, require_day_zone_count: 1, require_night_zone: true, require_night_zone_count: 1 },
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { facilityName, facilityType, displayName, email, password } = body as {
    facilityName?: string
    facilityType?: string
    displayName?: string
    email?: string
    password?: string
  }

  if (!facilityName?.trim() || !facilityType || !displayName?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 })
  }
  if (!['hospital', 'care_facility'].includes(facilityType)) {
    return NextResponse.json({ error: '施設タイプが不正です' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'パスワードは8文字以上で入力してください' }, { status: 400 })
  }

  const type = facilityType as 'hospital' | 'care_facility'
  const supabase = await createServiceClient()

  // ① 施設作成
  const { data: facility, error: facilityErr } = await supabase
    .from('facilities')
    .insert({ name: facilityName.trim(), type, plan: 'free' })
    .select('id')
    .single()

  if (facilityErr || !facility) {
    return NextResponse.json({ error: '施設の作成に失敗しました' }, { status: 500 })
  }
  const facilityId = facility.id

  // ② Supabase Auth ユーザー作成（確認メール送信・email_confirm 省略で未確認状態）
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: false,
  })

  if (authErr || !authData.user) {
    // ロールバック: 施設を削除
    await supabase.from('facilities').delete().eq('id', facilityId)
    const msg = authErr?.message?.includes('already registered')
      ? 'このメールアドレスは既に使用されています'
      : 'アカウントの作成に失敗しました'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const userId = authData.user.id

  // ③ users テーブルに登録
  const { error: userErr } = await supabase.from('users').insert({
    id: userId,
    facility_id: facilityId,
    email: email.trim(),
    display_name: displayName.trim(),
    role: 'admin',
  })

  if (userErr) {
    await supabase.auth.admin.deleteUser(userId)
    await supabase.from('facilities').delete().eq('id', facilityId)
    return NextResponse.json({ error: 'ユーザー情報の保存に失敗しました' }, { status: 500 })
  }

  // ④ デフォルトマスタ seed（並列）
  await Promise.all([
    supabase.from('shift_types').insert(
      DEFAULT_SHIFT_TYPES[type].map(st => ({ ...st, facility_id: facilityId }))
    ),
    supabase.from('leave_types').insert(
      DEFAULT_LEAVE_TYPES.map(lt => ({ ...lt, facility_id: facilityId }))
    ),
    supabase.from('constraint_settings').insert(
      DEFAULT_CONSTRAINTS.map(c => ({ ...c, facility_id: facilityId }))
    ),
    supabase.from('responsible_roles').insert({
      ...DEFAULT_RESPONSIBLE_ROLES[type],
      facility_id: facilityId,
    }),
  ])

  return NextResponse.json({ ok: true })
}
