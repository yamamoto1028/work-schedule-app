import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'

export default async function MyShiftsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: shifts } = await supabase
    .from('shifts')
    .select(`
      *,
      shift_types(name, short_name, color, time_zone)
    `)
    .eq('user_id', user.id)
    .gte('date', `${currentMonth}-01`)
    .lte('date', `${currentMonth}-31`)
    .in('status', ['published', 'confirmed'])
    .order('date')

  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">自分のシフト</h1>
        <p className="text-gray-500 mt-1">{monthLabel}のシフトを確認できます</p>
      </div>

      {shifts && shifts.length > 0 ? (
        <div className="grid gap-3">
          {shifts.map((shift) => {
            const shiftType = shift.shift_types as { name: string; short_name: string; color: string; time_zone: string } | null
            const date = new Date(shift.date)
            const dayNames = ['日', '月', '火', '水', '木', '金', '土']
            const dayLabel = `${date.getMonth() + 1}/${date.getDate()}(${dayNames[date.getDay()]})`

            return (
              <Card key={shift.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-sm font-medium text-gray-600 w-24">{dayLabel}</div>
                  {shiftType && (
                    <div
                      className="px-3 py-1 rounded-full text-white text-sm font-medium"
                      style={{ backgroundColor: shiftType.color }}
                    >
                      {shiftType.name}
                    </div>
                  )}
                  <div className="flex-1" />
                  <Badge variant={shift.status === 'confirmed' ? 'default' : 'secondary'} className={shift.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}>
                    {shift.status === 'confirmed' ? '確認済' : '未確認'}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-20 flex flex-col items-center gap-4 text-gray-400">
            <Calendar className="h-16 w-16" />
            <p className="text-lg font-medium">{monthLabel}のシフトはまだ公開されていません</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
