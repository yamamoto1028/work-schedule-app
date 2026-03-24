'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Facility = {
  id: string
  name: string
  type: 'hospital' | 'care_facility'
  logo_url: string | null
}

export default function FacilitySettings({ facility }: { facility: Facility }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: facility.name,
    type: facility.type,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('facilities')
      .update({ name: form.name, type: form.type })
      .eq('id', facility.id)

    if (error) {
      toast.error('更新に失敗しました')
    } else {
      toast.success('施設情報を更新しました')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>施設基本情報</CardTitle>
        <CardDescription>施設タイプによりヨモギ主任のセリフトーンが変わります</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>施設名 *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>施設タイプ *</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as 'hospital' | 'care_facility' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hospital">病院</SelectItem>
                <SelectItem value="care_facility">介護施設</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            保存する
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
