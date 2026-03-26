'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  shiftId: string
}

export default function ShiftConfirmButton({ shiftId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleConfirm = async () => {
    setLoading(true)
    await supabase
      .from('shifts')
      .update({ status: 'confirmed' })
      .eq('id', shiftId)
    router.refresh()
    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleConfirm}
      disabled={loading}
      className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      確認する
    </Button>
  )
}
