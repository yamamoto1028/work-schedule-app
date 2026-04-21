import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MAX_ATTEMPTS    = 10         // これを超えたらロック
const LOCKOUT_MINUTES = 30         // ロック継続時間（分）

type Body = { email: string; password: string }

// POST /api/auth/login
export async function POST(req: Request) {
  const { email, password } = await req.json() as Body

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 })
  }

  const service = await createServiceClient()

  // ─── 1. ロック状態の確認 ─────────────────────────────────────────
  const { data: attempt } = await service
    .from('login_attempts')
    .select('failed_count, locked_until')
    .eq('email', email)
    .maybeSingle()

  if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
    const unlockAt = new Date(attempt.locked_until)
    const minutes  = Math.ceil((unlockAt.getTime() - Date.now()) / 60_000)
    return NextResponse.json(
      { error: `アカウントがロックされています。約${minutes}分後に再試行してください。` },
      { status: 423 }
    )
  }

  // ─── 2. Supabase 認証（サーバーサイドで実行しセッション Cookie を付与）──
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

  // ─── 3. 失敗時: 試行回数を記録 ───────────────────────────────────
  if (authError || !data.user) {
    const newCount    = (attempt?.failed_count ?? 0) + 1
    const lockedUntil = newCount >= MAX_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
      : null

    await service.from('login_attempts').upsert({
      email,
      failed_count:   newCount,
      locked_until:   lockedUntil,
      last_failed_at: new Date().toISOString(),
    })

    if (newCount >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: `ログイン試行回数が${MAX_ATTEMPTS}回を超えたため、アカウントをロックしました。${LOCKOUT_MINUTES}分後に再試行してください。` },
        { status: 423 }
      )
    }

    const remaining = MAX_ATTEMPTS - newCount
    return NextResponse.json(
      { error: `メールアドレスまたはパスワードが正しくありません（残り${remaining}回）` },
      { status: 401 }
    )
  }

  // ─── 4. 成功時: 試行記録をリセット ───────────────────────────────
  await service.from('login_attempts').delete().eq('email', email)

  // ─── 5. ロール取得してリダイレクト先を返す ───────────────────────
  const { data: userData } = await service
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!userData) {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: 'アカウントが正しく設定されていません。管理者にお問い合わせください。' },
      { status: 403 }
    )
  }

  return NextResponse.json({ role: userData.role })
}
