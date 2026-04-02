'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  selectedMonth: string // YYYY-MM
}

export default function MonthNavigation({ selectedMonth }: Props) {
  const router = useRouter()

  const navigate = (direction: 'prev' | 'next') => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, direction === 'prev' ? m - 2 : m, 1)
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.push(`/staff/my-shifts?month=${newMonth}`)
  }

  const [year, month] = selectedMonth.split('-').map(Number)

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="font-medium text-gray-700 w-24 text-center">{year}年{month}月</span>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
