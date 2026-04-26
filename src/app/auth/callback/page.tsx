'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Supabase がメール確認リンクのクリック後にリダイレクトするページ
// フラグメント (#access_token=...) / クエリ (?code=...) の両方に対応
export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          router.replace('/admin/dashboard')
        } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          // セッションなし → ログインページへ
          router.replace('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 to-teal-100">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white text-2xl font-bold">
          よ
        </div>
        <p className="text-gray-600 text-sm">認証処理中...</p>
      </div>
    </div>
  )
}
