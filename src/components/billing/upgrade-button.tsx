'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  className?: string
  variant?: 'default' | 'outline'
  label?: string
}

export default function UpgradeButton({
  className,
  variant = 'default',
  label = 'Pro にアップグレード',
}: Props) {
  const [loading, setLoading] = useState(false)

  // bfcache から復元された場合（Stripe キャンセル後の戻るボタン等）は loading をリセットする
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false)
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const json = await res.json() as { url?: string; error?: string }

      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'チェックアウトの開始に失敗しました')
        return
      }

      window.location.href = json.url
    } catch {
      toast.error('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleUpgrade}
      disabled={loading}
      variant={variant}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2" />
      )}
      {loading ? '処理中...' : label}
    </Button>
  )
}
