'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MoreHorizontal, Pencil, Trash2, Moon, Sun } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import StaffEditDialog from './staff-edit-dialog'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type ResponsibleRole = {
  id: string
  name: string
  color: string
}

type StaffProfile = {
  id: string
  employment_type: string | null
  position: string | null
  responsible_role_id: string | null
  can_night_shift: boolean
  max_monthly_shifts: number | null
  phone: string | null
  staff_grade: 'full' | 'half' | 'new'
  fixed_night_count: number | null
  skills: string[]
  responsible_roles: { name: string; color: string } | null
}

type StaffUser = {
  id: string
  email: string
  display_name: string
  is_active: boolean
  created_at: string
  staff_profiles: StaffProfile | null
}

type Props = {
  staff: StaffUser[]
  facilityId: string
  responsibleRoles: ResponsibleRole[]
}

const gradeLabels: Record<string, string> = {
  full: 'フル職員',
  half: '半人前',
  new: '新人',
}

const gradeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  full: 'default',
  half: 'secondary',
  new: 'outline',
}

export default function StaffTable({ staff: initialStaff, facilityId, responsibleRoles }: Props) {
  const router = useRouter()
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null)

  const handleToggleActive = async (staffId: string, currentActive: boolean) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ is_active: !currentActive })
      .eq('id', staffId)

    if (error) {
      toast.error('更新に失敗しました')
    } else {
      toast.success(currentActive ? 'スタッフを無効化しました' : 'スタッフを有効化しました')
      router.refresh()
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[200px]">氏名</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>役職・責任者区分</TableHead>
            <TableHead>雇用形態</TableHead>
            <TableHead>職員区分</TableHead>
            <TableHead>夜勤</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialStaff.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-gray-400 py-12">
                スタッフが登録されていません
              </TableCell>
            </TableRow>
          ) : (
            initialStaff.map((s) => {
              const profile = s.staff_profiles
              return (
                <TableRow key={s.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{s.display_name}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{s.email}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {profile?.position && (
                        <div className="text-sm text-gray-700">{profile.position}</div>
                      )}
                      {profile?.responsible_roles && (
                        <Badge
                          className="text-xs"
                          style={{ backgroundColor: profile.responsible_roles.color + '20', color: profile.responsible_roles.color, borderColor: profile.responsible_roles.color }}
                          variant="outline"
                        >
                          {profile.responsible_roles.name}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {profile?.employment_type ?? '—'}
                  </TableCell>
                  <TableCell>
                    {profile ? (
                      <Badge variant={gradeVariants[profile.staff_grade]}>
                        {gradeLabels[profile.staff_grade]}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {profile?.can_night_shift ? (
                      <div className="flex items-center gap-1 text-indigo-600 text-sm">
                        <Moon className="h-3.5 w-3.5" />可
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Sun className="h-3.5 w-3.5" />不可
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className={s.is_active ? 'bg-green-100 text-green-700' : ''}>
                      {s.is_active ? '有効' : '無効'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget(s)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(s.id, s.is_active)}
                          className={s.is_active ? 'text-red-600' : 'text-green-600'}
                        >
                          {s.is_active ? '無効化' : '有効化'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {editTarget && (
        <StaffEditDialog
          staff={editTarget}
          facilityId={facilityId}
          responsibleRoles={responsibleRoles}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  )
}
