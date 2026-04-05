'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ChevronLeft, ChevronRight, Building2, Stethoscope, Heart, Mail } from 'lucide-react'

type Step = 1 | 2
type FacilityType = 'care_facility' | 'hospital'

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  // Step 1
  const [facilityName, setFacilityName] = useState('')
  const [facilityType, setFacilityType] = useState<FacilityType | null>(null)
  const [displayName, setDisplayName] = useState('')

  // Step 2
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault()
    if (!facilityName.trim() || !facilityType || !displayName.trim()) return
    setError(null)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityName, facilityType, displayName, email, password }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? '登録に失敗しました')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 to-teal-100 p-4">
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white text-2xl font-bold mb-4">
            よ
          </div>
          <h1 className="text-3xl font-bold text-gray-900">YOMOGI</h1>
          <p className="text-sm text-gray-500 mt-1">〜愚痴りながら最適解を出すシフト管理AI〜</p>
        </div>

        {sent ? (
          <Card className="shadow-lg">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
                <Mail className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-lg text-gray-900">確認メールを送信しました</p>
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{email}</span> 宛に確認メールを送りました。
                  <br />メール内のリンクをクリックして登録を完了してください。
                </p>
              </div>
              <p className="text-xs text-gray-400">メールが届かない場合は迷惑メールフォルダをご確認ください。</p>
              <Link href="/login" className="inline-block text-sm text-emerald-600 hover:underline font-medium">
                ログインページへ
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>新規施設登録</CardTitle>
                  <CardDescription className="mt-1">
                    {step === 1 ? '施設情報を入力してください' : '管理者アカウント情報を入力してください'}
                  </CardDescription>
                </div>
                <span className="text-sm text-gray-400">{step} / 2</span>
              </div>
              {/* ステップインジケーター */}
              <div className="flex gap-1 mt-3">
                <div className="h-1 flex-1 rounded-full bg-emerald-500" />
                <div className={`h-1 flex-1 rounded-full transition-colors ${step === 2 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              </div>
            </CardHeader>

            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {step === 1 ? (
                <form onSubmit={handleStep1Next} className="space-y-4">
                  {/* 施設タイプ選択 */}
                  <div className="space-y-2">
                    <Label>施設タイプ</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFacilityType('care_facility')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                          facilityType === 'care_facility'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Heart className="h-6 w-6" />
                        <span className="text-sm font-medium">介護施設</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFacilityType('hospital')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                          facilityType === 'hospital'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Stethoscope className="h-6 w-6" />
                        <span className="text-sm font-medium">病院</span>
                      </button>
                    </div>
                  </div>

                  {/* 施設名 */}
                  <div className="space-y-2">
                    <Label htmlFor="facilityName">
                      <Building2 className="inline h-3.5 w-3.5 mr-1" />
                      施設名
                    </Label>
                    <Input
                      id="facilityName"
                      placeholder="例: さくら介護センター"
                      value={facilityName}
                      onChange={e => setFacilityName(e.target.value)}
                      required
                    />
                  </div>

                  {/* 管理者表示名 */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName">管理者の氏名</Label>
                    <Input
                      id="displayName"
                      placeholder="例: 山田 太郎"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                    disabled={!facilityType || !facilityName.trim() || !displayName.trim()}
                  >
                    次へ
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@facility.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">パスワード（8文字以上）</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwordConfirm">パスワード（確認）</Label>
                    <Input
                      id="passwordConfirm"
                      type="password"
                      placeholder="••••••••"
                      value={passwordConfirm}
                      onChange={e => setPasswordConfirm(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setStep(1); setError(null) }}
                      disabled={loading}
                      className="gap-1.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      戻る
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          登録中...
                        </>
                      ) : (
                        '登録してはじめる'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {!sent && (
          <p className="text-center text-sm text-gray-500 mt-6">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-emerald-600 hover:underline font-medium">
              ログイン
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
