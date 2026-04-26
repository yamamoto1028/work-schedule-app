import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

// Supabase Auth がメール確認リンクのクリック後にリダイレクトするエンドポイント
// code を exchangeCodeForSession でセッションに交換し、管理者ダッシュボードへ
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
    // セッションをクリアしてログインページで改めて認証させる
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
