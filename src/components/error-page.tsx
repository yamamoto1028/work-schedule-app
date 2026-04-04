'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">エラーが発生しました</h2>
        <p className="text-sm text-gray-500">{error.message || 'ページの読み込みに失敗しました。'}</p>
      </div>
      <Button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700">
        再試行する
      </Button>
    </div>
  )
}
