'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDraggable } from '@dnd-kit/core'
import { ConstraintViolation } from '@/lib/constraints/checker'
import { ShiftRow } from './shift-calendar-page'
import { Loader2, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type ShiftType = {
  id: string
  name: string
  short_name: string
  color: string
  time_zone: 'day' | 'night'
}

type Props = {
  shift: ShiftRow | undefined
  userId: string
  date: string
  shiftTypes: ShiftType[]
  violations: ConstraintViolation[]
  isPending: boolean
  onSelect: (shiftTypeId: string | null) => void
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

function DraggableShiftBadge({
  shiftId,
  userId,
  date,
  shiftType,
  hasError,
  hasWarning,
  onClick,
}: {
  shiftId: string
  userId: string
  date: string
  shiftType: ShiftType
  hasError: boolean
  hasWarning: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shiftId,
    data: { userId, date, shiftTypeId: shiftType.id },
  })

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`
        relative text-[11px] font-bold px-1 py-0.5 rounded text-white
        cursor-grab active:cursor-grabbing select-none transition-opacity
        ${isDragging ? 'opacity-30' : 'opacity-100'}
        ${hasError ? 'ring-2 ring-red-400' : hasWarning ? 'ring-2 ring-yellow-400' : ''}
      `}
      style={{ backgroundColor: shiftType.color }}
    >
      {shiftType.short_name}
      {(hasError || hasWarning) && (
        <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${hasError ? 'bg-red-500' : 'bg-yellow-400'}`} />
      )}
    </span>
  )
}

// ボトムシート内のシフト選択グリッド（モバイル用）
function ShiftSelectSheet({
  open,
  onOpenChange,
  shiftTypes,
  shift,
  onSelect,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  shiftTypes: ShiftType[]
  shift: ShiftRow | undefined
  onSelect: (id: string | null) => void
}) {
  const dayTypes = shiftTypes.filter(t => t.time_zone === 'day')
  const nightTypes = shiftTypes.filter(t => t.time_zone === 'night')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="pb-8 px-4">
        <SheetHeader className="px-0 pb-3">
          <SheetTitle className="text-base">シフトを選択</SheetTitle>
        </SheetHeader>

        {dayTypes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">日中帯</p>
            <div className="grid grid-cols-3 gap-2">
              {dayTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-100 active:opacity-70 transition-opacity"
                >
                  <span
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-white text-lg font-bold"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.short_name}
                  </span>
                  <span className="text-xs text-gray-700 truncate w-full text-center">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {nightTypes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">夜間帯</p>
            <div className="grid grid-cols-3 gap-2">
              {nightTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-100 active:opacity-70 transition-opacity"
                >
                  <span
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-white text-lg font-bold"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.short_name}
                  </span>
                  <span className="text-xs text-gray-700 truncate w-full text-center">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {shift && (
          <button
            onClick={() => onSelect(null)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 border border-red-100 active:opacity-70 transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-sm">シフトを削除</span>
          </button>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default function ShiftCell({ shift, userId, date, shiftTypes, violations, isPending, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const shiftType = shift ? shiftTypes.find(t => t.id === shift.shift_type_id) : undefined
  const hasError = violations.some(v => v.severity === 'error')
  const hasWarning = violations.some(v => v.severity === 'warning')

  useEffect(() => {
    if (!open || isMobile) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-shift-popup]')) return
      if (ref.current && !ref.current.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, isMobile])

  const openPopup = () => {
    if (!isMobile && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPopupPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      })
    }
    setOpen(o => !o)
  }

  const handleSelect = (id: string | null) => {
    setOpen(false)
    onSelect(id)
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-9 w-full">
        <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div ref={ref} className="relative w-full h-full flex items-center justify-center">
      {shiftType && shift ? (
        <DraggableShiftBadge
          shiftId={shift.id}
          userId={userId}
          date={date}
          shiftType={shiftType}
          hasError={hasError}
          hasWarning={hasWarning}
          onClick={openPopup}
        />
      ) : (
        <button
          className="w-full h-full flex items-center justify-center hover:bg-gray-100/60 transition-colors"
          onClick={openPopup}
          title="シフトを追加"
        >
          <span className="text-gray-200 text-lg leading-none">·</span>
        </button>
      )}

      {/* モバイル: ボトムシート */}
      {isMobile && (
        <ShiftSelectSheet
          open={open}
          onOpenChange={setOpen}
          shiftTypes={shiftTypes}
          shift={shift}
          onSelect={handleSelect}
        />
      )}

      {/* デスクトップ: 固定位置ポップアップ */}
      {!isMobile && open && createPortal(
        <div
          data-shift-popup=""
          className="fixed z-9999 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-35"
          style={{ top: popupPos.top, left: popupPos.left, transform: 'translateX(-50%)' }}
        >
          <div className="text-[10px] text-gray-400 mb-1 px-1">シフトを選択</div>

          <div className="text-[10px] text-gray-500 px-1 mb-0.5">日中帯</div>
          {shiftTypes.filter(t => t.time_zone === 'day').map(t => (
            <button
              key={t.id}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-left"
              onClick={() => handleSelect(t.id)}
            >
              <span
                className="inline-block w-6 text-center text-[11px] font-bold py-0.5 rounded text-white shrink-0"
                style={{ backgroundColor: t.color }}
              >
                {t.short_name}
              </span>
              <span className="text-xs text-gray-700 truncate">{t.name}</span>
            </button>
          ))}

          {shiftTypes.some(t => t.time_zone === 'night') && (
            <>
              <div className="text-[10px] text-gray-500 px-1 mt-1 mb-0.5">夜間帯</div>
              {shiftTypes.filter(t => t.time_zone === 'night').map(t => (
                <button
                  key={t.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-left"
                  onClick={() => handleSelect(t.id)}
                >
                  <span
                    className="inline-block w-6 text-center text-[11px] font-bold py-0.5 rounded text-white shrink-0"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.short_name}
                  </span>
                  <span className="text-xs text-gray-700 truncate">{t.name}</span>
                </button>
              ))}
            </>
          )}

          {shift && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                className="w-full px-2 py-1.5 rounded hover:bg-red-50 text-left text-xs text-red-500"
                onClick={() => handleSelect(null)}
              >
                シフトを削除
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
