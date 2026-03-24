import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export default async function ShiftsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">シフト管理</h1>
        <p className="text-gray-500 mt-1">シフト表の作成・編集・AIによる自動生成を行います</p>
      </div>

      <Card>
        <CardContent className="py-20 flex flex-col items-center gap-4 text-gray-400">
          <Calendar className="h-16 w-16" />
          <p className="text-lg font-medium">Week 2で実装予定</p>
          <p className="text-sm text-center max-w-md">
            カレンダービュー・ドラッグ＆ドロップ編集・ヨモギ主任AIシフト生成は<br />
            Week 2・Week 3で実装します
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
