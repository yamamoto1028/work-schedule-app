import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッションの更新（必須）
  // getClaims() は期限切れのトークンを更新したうえで、非対称鍵なら手元で JWT を検証する
  // （Supabase Auth への問い合わせが不要。対称鍵の場合は getUser() と同じく問い合わせる）
  // 無効な refresh token の場合はエラーを返すが、未ログインとして扱う
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  const user = claimsData?.claims ?? null

  if (authError?.status === 400) {
    // 無効な refresh token → クッキーをクリアして未ログイン状態にする
    try { await supabase.auth.signOut() } catch { /* ignore */ }
  }

  const { pathname } = request.nextUrl

  // 未ログイン → ログインページへ（ロールチェックはlayoutに委譲）
  const publicPaths = ['/login', '/register', '/auth/callback', '/api', '/legal']
  if (!user && !publicPaths.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
