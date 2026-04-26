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
    let handled = false

    const handle = (session: boolean) => {
      if (handled) return
      handled = true
      if (session) {
        router.replace('/admin/dashboard')
      } else {
        router.replace('/login')
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION は URL 処理前に発火するためスキップ
      if (event === 'INITIAL_SESSION') return
      handle(!!session)
    })

    // フォールバック: 8秒後もイベントがなければセッションを直接確認
    const timeout = setTimeout(async () => {
      if (handled) return
      const { data: { session } } = await supabase.auth.getSession()
      handle(!!session)
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
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
