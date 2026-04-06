import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  CalendarDays,
  Brain,
  Bell,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Users,
  FileSpreadsheet,
} from 'lucide-react'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const result = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (result.data as { role: string } | null)?.role
    if (role === 'staff') {
      redirect('/staff/my-shifts')
    } else {
      redirect('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ナビバー */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
              よ
            </div>
            <span className="text-lg font-bold text-gray-900">YOMOGI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">ログイン</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                無料で試す
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ヒーローセクション */}
        <section className="bg-linear-to-br from-emerald-50 via-white to-teal-50 py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <Badge className="mb-6 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
              <Sparkles className="w-3 h-3 mr-1" />
              医療・介護施設向け AI シフト管理
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              ぼやきながら<br />
              <span className="text-emerald-600">最適解</span>を出す<br />
              シフト管理 AI
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
              「こんな無茶なシフト組めるか〜！」とぼやきながら、でもちゃんと最適なシフトを作ってくれる。
              ヨモギ主任が地獄のシフト作成を一緒に引き受けます。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-base">
                  無料で始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="px-8 py-3 text-base">
                  ログイン
                </Button>
              </Link>
            </div>

            {/* モックUI プレースホルダー */}
            <div className="mt-16 relative">
              <div className="rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-white max-w-4xl mx-auto">
                {/* ダミーウィンドウバー */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-3 text-xs text-gray-400">YOMOGI — シフト管理画面</span>
                </div>
                {/* ダミーシフトカレンダー */}
                <div className="p-4 bg-white">
                  {/* ヘッダー行 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-5 rounded bg-gray-200 animate-pulse" />
                      <div className="w-16 h-5 rounded bg-emerald-100 animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-20 h-7 rounded bg-gray-100 animate-pulse" />
                      <div className="w-24 h-7 rounded bg-emerald-100 animate-pulse" />
                    </div>
                  </div>
                  {/* グリッド */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <td className="border border-gray-100 bg-gray-50 p-2 w-24 font-medium text-gray-600">スタッフ</td>
                          {Array.from({ length: 10 }, (_, i) => (
                            <td key={i} className={`border border-gray-100 p-2 text-center font-medium w-10 ${i === 5 ? 'bg-blue-50 text-blue-600' : i === 6 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-600'}`}>
                              {i + 1}
                            </td>
                          ))}
                          <td className="border border-gray-100 bg-gray-50 p-2 text-center text-gray-400">…</td>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: '田中 花子', shifts: ['日', '日', '夜', '明', '休', '', '日', '日', '夜', '明'] },
                          { name: '山田 太郎', shifts: ['夜', '明', '休', '日', '日', '夜', '明', '休', '日', '日'] },
                          { name: '佐藤 美咲', shifts: ['休', '日', '日', '夜', '明', '日', '休', '日', '日', '夜'] },
                          { name: '鈴木 一郎', shifts: ['日', '夜', '明', '休', '日', '日', '日', '夜', '明', '休'] },
                        ].map((row, ri) => (
                          <tr key={ri}>
                            <td className="border border-gray-100 bg-gray-50 p-2 text-gray-700 font-medium whitespace-nowrap text-xs">{row.name}</td>
                            {row.shifts.map((s, ci) => (
                              <td key={ci} className="border border-gray-100 p-1 text-center">
                                {s && (
                                  <span className={`inline-block px-1 py-0.5 rounded text-xs font-medium ${
                                    s === '夜' ? 'bg-indigo-100 text-indigo-700' :
                                    s === '明' ? 'bg-purple-100 text-purple-700' :
                                    s === '休' ? 'bg-gray-100 text-gray-500' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>{s}</span>
                                )}
                              </td>
                            ))}
                            <td className="border border-gray-100 p-2 text-center text-gray-300">…</td>
                          </tr>
                        ))}
                        {/* フッター：日中帯/夜間帯カウント */}
                        <tr>
                          <td className="border border-gray-100 bg-amber-50 p-2 text-xs font-medium text-amber-700">日中帯</td>
                          {['3', '3', '1', '2', '3', '2', '2', '3', '2', '1'].map((n, i) => (
                            <td key={i} className="border border-gray-100 bg-amber-50 p-2 text-center text-xs font-bold text-amber-700">{n}</td>
                          ))}
                          <td className="border border-gray-100 bg-amber-50 p-2 text-center text-amber-400">…</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-100 bg-indigo-50 p-2 text-xs font-medium text-indigo-700">夜間帯</td>
                          {['1', '1', '1', '1', '0', '1', '1', '1', '1', '1'].map((n, i) => (
                            <td key={i} className="border border-gray-100 bg-indigo-50 p-2 text-center text-xs font-bold text-indigo-700">{n}</td>
                          ))}
                          <td className="border border-gray-100 bg-indigo-50 p-2 text-center text-indigo-400">…</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* ヨモギ主任コメント */}
                  <div className="mt-4 flex items-start gap-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">よ</div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-800 mb-0.5">ヨモギ主任</p>
                      <p className="text-xs text-emerald-700">珍しぅ綺麗に組めとるんじゃな。あんたもやればできるんよぉ。スクショしときんさいよ。</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* グロー効果 */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-emerald-200 blur-3xl opacity-40 rounded-full" />
            </div>
          </div>
        </section>

        {/* 機能セクション */}
        <section className="py-20 sm:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                YOMOGIでできること
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                シフト作成の「面倒くさい」を、AIと一緒に全部解決します。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-5">
                    <Brain className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">AI シフト自動生成</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">
                    休暇希望・夜勤制限・スタッフ属性を考慮して、
                    ヨモギ主任がぼやきながら最適なシフトを自動生成。
                    ドラッグ&ドロップで細かい調整も簡単。
                  </p>
                  <ul className="space-y-1.5">
                    {['5カテゴリの制約チェック', '不満スコアで公平性を可視化', '安芸弁のヨモギ主任がナビゲート'].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mb-5">
                    <CalendarDays className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">視覚的なシフト管理</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">
                    月次カレンダーでスタッフ全員のシフトを一覧表示。
                    セルをドラッグするだけで割り当て変更、制約違反は
                    リアルタイムで警告バッジを表示。
                  </p>
                  <ul className="space-y-1.5">
                    {['D&D で直感的な編集', '日中帯・夜間帯の人数を自動集計', 'Excel (.xlsx) ダウンロード対応'].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-8 pb-6 px-6">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-5">
                    <Bell className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">スタッフ管理 & 通知</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">
                    休暇申請の承認・却下をアプリ上で完結。
                    シフト公開時にメール通知を自動送信。
                    スタッフは自分のシフトをスマホからいつでも確認できます。
                  </p>
                  <ul className="space-y-1.5">
                    {['休暇申請の承認フロー', 'シフト公開時のメール自動通知', 'スタッフ確認ステータスを一覧管理'].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 数字で見るセクション */}
        <section className="py-16 bg-gray-50 border-y border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-4xl font-extrabold text-emerald-600 mb-1">5 カテゴリ</p>
                <p className="text-sm text-gray-500">連勤・夜勤・人数・属性・行事の制約を自動チェック</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-4xl font-extrabold text-teal-600 mb-1">Claude AI</p>
                <p className="text-sm text-gray-500">最新の Claude Sonnet でシフトを自動生成</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-4xl font-extrabold text-indigo-600 mb-1">Excel 対応</p>
                <p className="text-sm text-gray-500">ボタン一つで .xlsx を即ダウンロード</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA セクション */}
        <section className="py-20 sm:py-28 bg-linear-to-br from-emerald-600 to-teal-700 text-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 text-3xl font-bold mb-6">
              よ
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              さあ、シフト地獄から<br />卒業しましょう
            </h2>
            <p className="text-emerald-100 text-lg mb-10">
              ヨモギ主任が愚痴りながらでも、ちゃんと最適解を出します。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 px-8 py-3 text-base font-semibold">
                  施設を新規登録する
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="ghost" className="text-white border border-white/40 hover:bg-white/10 px-8 py-3 text-base">
                  ログインする
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
              よ
            </div>
            <span className="text-sm font-medium text-gray-300">YOMOGI</span>
            <span className="text-xs text-gray-500">〜愚痴りながら最適解を出すシフト管理AI〜</span>
          </div>
          <p className="text-xs text-gray-600">© 2026 YOMOGI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
