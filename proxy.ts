import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/** /admin/* への Basic 認証チェック
 *  ADMIN_BASIC_AUTH_USER / ADMIN_BASIC_AUTH_PASSWORD が設定されている場合のみ有効。
 *  未設定時はチェックをスキップする（ローカル開発の利便性のため）。
 */
function checkBasicAuth(request: NextRequest): NextResponse | null {
  const user = process.env.ADMIN_BASIC_AUTH_USER
  const pass = process.env.ADMIN_BASIC_AUTH_PASSWORD

  // 環境変数が未設定の場合はスキップ
  if (!user || !pass) return null

  const authHeader = request.headers.get('authorization') ?? ''

  if (authHeader.startsWith('Basic ')) {
    try {
      const decoded    = atob(authHeader.slice('Basic '.length))
      const colonIndex = decoded.indexOf(':')
      const inputUser  = decoded.slice(0, colonIndex)
      const inputPass  = decoded.slice(colonIndex + 1)

      if (inputUser === user && inputPass === pass) return null  // 認証成功
    } catch {
      // base64 デコード失敗は認証失敗として扱う
    }
  }

  // 認証失敗 → ブラウザに Basic 認証ダイアログを表示させる
  return new NextResponse('管理画面へのアクセスには認証が必要です', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="YOMOGI Admin"' },
  })
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /admin/* ルートに Basic 認証を適用（API は Supabase セッション認証で保護済み）
  if (pathname.startsWith('/admin')) {
    const authResponse = checkBasicAuth(request)
    if (authResponse) return authResponse
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
