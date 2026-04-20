'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  className?: string
}

export default function ManagePlanButton({ className }: Props) {
  const [loading, setLoading] = useState(false)

  const handleManage = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json() as { url?: string; error?: string }

      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'ポータルの開始に失敗しました')
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
      variant="outline"
      onClick={handleManage}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4 mr-2" />
      )}
      {loading ? '処理中...' : 'プランを管理'}
    </Button>
  )
}
