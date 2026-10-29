import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | YOMOGI',
  description: 'YOMOGIの特定商取引法に基づく表記です。',
}

const enterprisePrices = [
  ['2ブロック', '月額5,980円'],
  ['3ブロック', '月額7,980円'],
  ['5ブロック', '月額12,800円'],
  ['10ブロック', '月額24,800円'],
]

const disclosures: Array<[string, ReactNode]> = [
  ['販売事業者', '山本 修平（屋号: YOMOGI-App）'],
  ['運営責任者', '山本 修平'],
  [
    '所在地',
    '特定商取引法第11条ただし書きに基づき、請求があった場合には遅滞なく開示いたします。開示をご希望の場合は、下記メールアドレスまでご連絡ください。',
  ],
  [
    '電話番号',
    '特定商取引法第11条ただし書きに基づき、請求があった場合には遅滞なく開示いたします。開示をご希望の場合は、下記メールアドレスまでご連絡ください。',
  ],
  ['メールアドレス', 'shuhei.yamamoto.h10@gmail.com'],
  [
    '販売価格',
    <div key="prices" className="space-y-3">
      <p>Free: 無料</p>
      <p>Pro: 月額3,980円（1施設あたり）</p>
      <div>
        <p className="mb-2">Enterprise:</p>
        <ul className="space-y-1 pl-5 list-disc">
          {enterprisePrices.map(([blocks, price]) => (
            <li key={blocks}>{blocks}: {price}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-gray-500">
          上記以外のブロック数は、お申し込み画面に表示される金額をご確認ください。
        </p>
      </div>
      <p className="text-sm text-gray-500">表示価格はすべて税込です。</p>
    </div>,
  ],
  [
    '商品代金以外の必要料金',
    '本サービスの利用に必要なインターネット接続料金および通信料金は、お客様のご負担となります。',
  ],
  ['支払方法', 'クレジットカード決済。Enterpriseの請求書払いは、個別契約で合意した条件に従います。'],
  [
    '支払時期',
    '初回契約に限り、契約開始日から30日間は無料です。無料期間終了日に初回料金を請求し、その後は毎月同日に自動更新して請求します。',
  ],
  ['サービスの提供時期', 'お申し込みおよび決済手続きの完了後、直ちにご利用いただけます。'],
  [
    '解約について',
    '管理画面の「プランを管理」からいつでも解約できます。無料期間中に解約した場合、料金は発生しません。有料期間中の解約は現在の契約期間終了時に適用され、それまではサービスをご利用いただけます。',
  ],
  [
    '返品・返金について',
    'サービスの性質上、提供開始後の返品はお受けしていません。法令に定める場合を除き、支払い済み料金の日割り返金は行いません。',
  ],
  ['動作環境', '最新版のGoogle Chrome、Safari、Microsoft Edgeを推奨します。'],
]

export default function CommercialTransactionsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-8 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          ← YOMOGI トップへ戻る
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            特定商取引法に基づく表記
          </h1>

          <dl className="mt-8 divide-y divide-gray-100 border-y border-gray-100">
            {disclosures.map(([label, value]) => (
              <div key={label} className="grid gap-2 py-5 sm:grid-cols-[12rem_1fr] sm:gap-6">
                <dt className="font-medium text-gray-700">{label}</dt>
                <dd className="leading-7 text-gray-600">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 text-sm text-gray-500">最終更新日: 2026年10月28日</p>
        </div>
      </div>
    </main>
  )
}
