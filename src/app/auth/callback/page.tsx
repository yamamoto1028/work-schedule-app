'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Supabase がメール確認リンクのクリック後にリダイレクトするページ。
// generateLink(signup) はハッシュ形式 (#access_token=...) でトークンを返すため
// URL フラグメントを手動パースして setSession を呼ぶ。
export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function handleCallback() {
      const hash = window.location.hash

      // ① ハッシュに access_token が含まれる場合（generateLink の implicit flow）
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.slice(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token') ?? ''

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) {
            router.replace('/admin/dashboard')
            return
          }
        }
      }

      // ② クエリに code が含まれる場合（PKCE flow）
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.replace('/admin/dashboard')
          return
        }
      }

      // ③ どちらもなければログインへ
      router.replace('/login')
    }

    handleCallback()
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
