'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Building2, Loader2, CreditCard, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  calcEnterpriseMonthlyTotal,
  calcEnterpriseListPrice,
  calcEnterpriseDiscountPct,
} from '@/lib/stripe/pricing'

// 料金表の主要アンカー点
const PRICE_TABLE = [
  { blocks: 2,  monthly: 5_980 },
  { blocks: 3,  monthly: 7_980 },
  { blocks: 5,  monthly: 12_800 },
  { blocks: 10, monthly: 24_800 },
]

type Props = {
  className?: string
  variant?: 'default' | 'outline'
  label?: string
}

export default function EnterpriseInquiryButton({
  className,
  variant = 'outline',
  label = 'Enterprise にアップグレード',
}: Props) {
  const [open, setOpen]           = useState(false)
  const [fetching, setFetching]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [facilityName, setFacilityName] = useState('')
  const [blockCount, setBlockCount] = useState('2')
  // bfcache から復元された場合（Stripe キャンセル後の戻るボタン等）は state をリセットする
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setSubmitting(false)
        setOpen(false)
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  const blockNum     = Math.max(2, Number(blockCount) || 2)
  const monthly      = calcEnterpriseMonthlyTotal(blockNum)
  const listPrice    = calcEnterpriseListPrice(blockNum)
  const discountPct  = calcEnterpriseDiscountPct(blockNum)

  const handleOpen = async () => {
    setOpen(true)
    if (facilityName) return
    setFetching(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('facilities(name)')
        .eq('id', user.id)
        .single()
      const facility = data?.facilities as { name: string } | null
      setFacilityName(facility?.name ?? '')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/stripe/enterprise-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockCount: blockNum }),
      })
      const json = await res.json() as { url?: string; error?: string }

      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'チェックアウトの開始に失敗しました')
        return
      }

      window.location.href = json.url
    } catch {
      toast.error('ネットワークエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button variant={variant} className={className} onClick={handleOpen}>
        <Building2 className="h-4 w-4 mr-2" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enterprise プランへアップグレード</DialogTitle>
            <DialogDescription>
              ブロック数が増えるほど1ブロックあたりの単価が下がります。
            </DialogDescription>
          </DialogHeader>

          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 施設名 */}
              {facilityName && (
                <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-sm font-medium text-violet-900">
                  {facilityName}
                </div>
              )}

              {/* 料金テーブル */}
              <div className="rounded-lg border border-gray-200 overflow-hidden text-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs">
                      <th className="text-left px-3 py-2 font-medium">ブロック数</th>
                      <th className="text-right px-3 py-2 font-medium">月額</th>
                      <th className="text-right px-3 py-2 font-medium">定価比</th>
                      <th className="text-right px-3 py-2 font-medium">割引</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {PRICE_TABLE.map(row => {
                      const list    = calcEnterpriseListPrice(row.blocks)
                      const disc    = calcEnterpriseDiscountPct(row.blocks)
                      const current = blockNum === row.blocks
                      return (
                        <tr
                          key={row.blocks}
                          className={current ? 'bg-violet-50' : 'hover:bg-gray-50 cursor-pointer'}
                          onClick={() => setBlockCount(String(row.blocks))}
                        >
                          <td className="px-3 py-2 font-medium text-gray-800">
                            {current && <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 mr-1.5 mb-0.5" />}
                            {row.blocks} ブロック
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-violet-900">
                            ¥{row.monthly.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-400 line-through text-xs">
                            ¥{list.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium text-xs">
                              <TrendingDown className="h-3 w-3" />
                              {disc}% OFF
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ブロック数入力 */}
              <div className="space-y-1.5">
                <Label htmlFor="ent-block">
                  ご利用予定のブロック数<span className="text-red-500 ml-0.5">*</span>
                  <span className="text-xs text-gray-400 ml-1 font-normal">（2以上）</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ent-block"
                    type="number"
                    min={2}
                    max={99}
                    value={blockCount}
                    onChange={e => setBlockCount(e.target.value)}
                    className="w-28"
                    required
                  />
                  <span className="text-sm text-gray-500">ブロック</span>
                </div>
              </div>

              {/* 月額プレビュー */}
              <div className="rounded-lg border-2 border-violet-300 bg-violet-50 px-4 py-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-violet-600 mb-0.5">{blockNum} ブロック / 月額</p>
                    <p className="text-2xl font-bold text-violet-900">
                      ¥{monthly.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 line-through">定価 ¥{listPrice.toLocaleString()}</p>
                    <p className="text-sm font-bold text-emerald-600 flex items-center gap-0.5">
                      <TrendingDown className="h-3.5 w-3.5" />
                      {discountPct}% OFF
                    </p>
                  </div>
                </div>
                <p className="text-xs text-violet-500 mt-1.5">
                  約 ¥{Math.floor(monthly / blockNum).toLocaleString()} / ブロック・税抜・翌月以降自動更新
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? '処理中...' : `¥${monthly.toLocaleString()} で申し込む`}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
