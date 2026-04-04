@AGENTS.md

# YOMOGI — Claude 向けプロジェクトガイド

医療介護向け AI シフト管理アプリ。詳細な要件定義は `REQUIREMENTS.md` を参照。

---

## プロジェクト概要

| 項目           | 内容                                             |
| -------------- | ------------------------------------------------ |
| アプリ名       | YOMOGI                                           |
| ディレクトリ名 | `work-schedule-app`                              |
| 対象           | 医療・介護施設のシフト作成管理者 および スタッフ |
| 施設タイプ     | 病院 / 介護施設（切替対応）                      |
| デプロイ       | Vercel                                           |

---

## 技術スタック

| レイヤー       | 技術                                                    |
| -------------- | ------------------------------------------------------- |
| フロントエンド | Next.js **16**（App Router）/ TypeScript                |
| スタイリング   | Tailwind CSS v4 + shadcn/ui（base-ui ベース）           |
| シフト表 UI    | dnd-kit（カスタムカレンダーグリッド）                   |
| データ取得     | SWR（クライアントサイドキャッシュ）                     |
| バックエンド   | Next.js API Routes（サーバーレス）                      |
| DB             | Supabase（PostgreSQL + Auth + Realtime）                |
| AI             | Claude API `claude-sonnet-4-20250514`（ストリーミング） |
| メール         | Resend                                                  |
| Excel 出力     | ExcelJS（サーバーサイド）                               |

---

## ディレクトリ構成

```
work-schedule-app/
├── proxy.ts                 # ルートガード（Next.js 16 の規約。旧 middleware.ts）
├── .env.example             # 環境変数テンプレート（本番設定の参照用）
├── app/
│   ├── (auth)/              # ログイン・登録
│   ├── (admin)/             # 管理者画面
│   │   ├── dashboard/       # loading.tsx / error.tsx 配置済み
│   │   ├── shifts/          # シフト表・AI生成 / loading.tsx / error.tsx
│   │   ├── staff/           # スタッフ管理 / loading.tsx / error.tsx
│   │   ├── leaves/          # 休暇申請管理 / loading.tsx / error.tsx
│   │   └── settings/        # 施設設定・各種マスタ・制約設定 / loading.tsx / error.tsx
│   ├── (staff)/             # スタッフ画面
│   │   ├── my-shifts/       # 自分のシフト確認（?month=YYYY-MM で過去月参照可）
│   │   └── requests/        # 休暇申請 / loading.tsx / error.tsx
│   └── api/
│       ├── shifts/          # シフト CRUD
│       │   └── export/      # Excel 出力（GET ?month=YYYY-MM&facilityId=xxx）
│       ├── leaves/          # 休暇申請 CRUD
│       │   └── count/       # 未承認件数取得
│       ├── ai/
│       │   └── generate-shifts/ # Claude API ストリーミング
│       ├── notify/          # Resend メール通知
│       └── responsible-roles/sync-admin/
├── components/
│   ├── shift-calendar/      # カレンダーグリッド・D&D・リスト表示
│   ├── staff/               # スタッフ管理テーブル・月ナビ
│   ├── settings/            # 各設定コンポーネント
│   ├── yomogi/              # ヨモギ主任 UI・ストリーミング表示
│   ├── error-page.tsx       # 共通エラーバウンダリ UI
│   └── ui/                  # shadcn/ui コンポーネント
├── lib/
│   ├── supabase/            # DB クライアント（server / client / middleware）
│   ├── ai/                  # Claude API ラッパー・ヨモギ主任プロンプト
│   ├── constraints/         # 制約チェックロジック（5カテゴリ）
│   └── utils.ts             # getMonthRange / toggleArrayItem など共通ユーティリティ
├── supabase/migrations/     # 001〜008 のマイグレーションファイル
├── types/                   # 型定義（DB型・API型）
├── REQUIREMENTS.md          # 要件定義書（機能・DB・制約の詳細はここを参照）
├── CLAUDE.md                # このファイル
└── AGENTS.md                # エージェント構成ガイド
```

---

## 環境変数

`.env.local` に以下を設定する。本番は Vercel の環境変数に登録。

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # サーバーサイドのみ使用。クライアントでは絶対に使わない

# Claude API
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 開発ルール

### 認証・セキュリティ（最重要）

- `SUPABASE_SERVICE_ROLE_KEY` は **サーバーサイドのみ** で使用。クライアントコンポーネントやブラウザ側のコードには絶対に渡さない
- API Routes は全て `createServerClient` でセッションを検証し、`users.role` をチェックしてから処理する
- Supabase RLS が施設データを分離しているが、API 側でも必ず `facility_id` の一致を確認する
- 管理者画面 `/app/(admin)/**` は `role = admin` のみ、スタッフ画面 `/app/(staff)/**` は `role = staff` のみアクセス可

### Supabase クライアントの使い分け

```typescript
// Server Component / API Route → createClient を使う（server.ts）
import { createClient } from "@/lib/supabase/server";
// Client Component → createClient を使う（client.ts）
import { createClient } from "@/lib/supabase/client";
// proxy.ts（旧 middleware）→ updateSession を使う
import { updateSession } from "@/lib/supabase/middleware";
```

### コンポーネント設計

- `'use client'` は必要な場合のみ付与。デフォルトは Server Component
- shadcn/ui のコンポーネントを優先して使う。**shadcn v4 は base-ui ベースのため `asChild` prop が存在しない**
- `components/yomogi/` 配下はヨモギ主任 UI 専用。他の UI と混在させない
- `components/shift-calendar/` 配下はカレンダー・D&D 専用
- クライアントサイドのデータ取得は **SWR** を使う。`useSWR` + `mutate` パターンで楽観的更新を行う

### Tailwind CSS v4 注意事項

- 任意値（`min-w-[44px]` など）は使わず Tailwind の標準スケール（`min-w-11`）を使う
- `flex-shrink-0` → `shrink-0`、`bg-gradient-to-r` → `bg-linear-to-r`（v4 正規クラス名）
- カスタムブレークポイントは `min-[1120px]:flex-row` のような任意値ブレークポイントで対応

### ルーティングガード（Next.js 16）

- **`src/middleware.ts` は廃止。`proxy.ts`（プロジェクトルート）を使う**
- エクスポート関数名は `proxy`（`middleware` ではない）
- 各 layout.tsx でロールチェックを行い、不正アクセス時は `redirect()` する

### 型定義

- DB テーブルの型は `supabase gen types typescript` で自動生成し `types/database.ts` に配置
- API のリクエスト・レスポンス型は `types/api.ts` に定義
- `any` 型の使用は禁止。やむを得ない場合はコメントで理由を明記

### 制約チェックロジック

- 制約チェックは `lib/constraints/` 配下に5カテゴリ別にファイルを分けて実装
  - `category-a-consecutive.ts` — 連勤・休日ルール
  - `category-b-night.ts` — 夜勤回数・配置ルール
  - `category-c-staffing.ts` — シフト人数・構成ルール
  - `category-d-attribute.ts` — スタッフ属性別制約
  - `category-e-event.ts` — 施設固有行事ルール
- 制約の適用優先度は `REQUIREMENTS.md 4.5` の「制約の適用優先度」セクションに従う
- 日中帯・夜間帯の判定は `shift_types.time_zone` カラム（`'day'` / `'night'`）を必ず参照する。勤務区分名に依存しないこと

### AI（ヨモギ主任）実装

- プロンプト設計は `REQUIREMENTS.md 4.4.5` に従う
- キャラクターは安芸弁（広島県西部の方言）を使う。備後弁と混同しないこと
- 施設タイプ（`hospital` / `care_facility`）でトーンが切り替わる
- ストリーミングレスポンスは `app/api/ai/route.ts` で処理し、フロントは `components/yomogi/` で受け取る

### Excel 出力

- `app/api/shifts/export/route.ts` でサーバーサイド生成（GET `/api/shifts/export?month=YYYY-MM&facilityId=xxx`）
- ExcelJS を使用。クライアントサイドで生成しない
- ファイル名は `YOMOGI_{YYYY}年{M}月シフト表_{YYYYMMDD}.xlsx`
- 集計セルは Python や JS で計算した値を直接埋め込まず、Excel SUM / COUNTA 数式を使う
- **`ExcelJS.utils.encode_col` は存在しない**。列インデックス→列名変換は `colName(index)` ヘルパー関数を自前実装する
- `leave_types` テーブルに `short_name` カラムはない。`key` フィールドから略称を導出する

### 夜間帯人数カウントの特例

- カレンダーグリッド・Excel 出力ともに「明け」シフトは夜間帯人数にカウントしない
- 判定: `st.short_name.includes('明') || st.name.includes('明け')`（DB にフラグなし、名前ベースのヒューリスティック）

### エラーハンドリング・ローディング UI

- 各ルートに `loading.tsx`（Skeleton）と `error.tsx`（`ErrorPage` 再エクスポート）を配置済み
- 共通エラー UI は `components/error-page.tsx` に集約。各 error.tsx はこれを re-export する
- SWR の `isLoading` はセッション内の初回のみ `true`。2回目以降はキャッシュで即表示される

---

## よく使うコマンド

```bash
# 開発サーバー起動
npm run dev
# 型チェック
npx tsc --noEmit
# Supabase DB マイグレーション適用
supabase db push
# Supabase 型定義生成
supabase gen types typescript --local > types/database.ts
# lint
npm run lint
```

---

## DB テーブル一覧（概要）

詳細な SQL 定義は `REQUIREMENTS.md 5.2` を参照。マイグレーションは `supabase/migrations/001〜008` まで適用済み。

| テーブル名              | 概要                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `facilities`            | 施設マスタ                                                   |
| `users`                 | ユーザー（Supabase Auth と連携）                             |
| `staff_profiles`        | スタッフ詳細（`staff_grade` / `fixed_night_count` / `allowed_shift_type_ids` 含む） |
| `shift_types`           | 勤務区分マスタ（`time_zone: day/night` で帯分類）            |
| `leave_types`           | 休暇区分マスタ（`monthly_limit` カラム追加済み: 007）        |
| `responsible_roles`     | 責任者区分マスタ（日中帯・夜間帯の必須配置設定）             |
| `shifts`                | シフト本体（`status: draft/published/confirmed`）            |
| `leave_requests`        | 休暇申請（`leave_type_id` で区分を管理）                     |
| `notifications`         | アプリ内通知（`types/database.ts` に型定義済み: 004）        |
| `constraint_settings`   | 制約設定（`constraint_key` + `is_enabled` + `value: jsonb`） |
| `committee_assignments` | 委員会担当（会議開催日に日中帯シフト必須）                   |
| `facility_events`       | 施設行事（入浴日・リネン交換日等）                           |

---

## 実装状況（Week 1〜4 完了）

```
Week 1（基盤）: ✅ セットアップ / DB / Auth / スタッフ CRUD / マスタ設定画面
Week 2（コア）: ✅ カレンダー UI / D&D / 制約チェック / 承認フロー / 通知
Week 3（AI）  : ✅ Claude API / ヨモギ主任 UI / AI 生成 / 不満スコア / 一覧リスト表示
Week 4（完成）: ✅ エラー処理 / ローディング UI / SWR / レスポンシブ / Excel 出力 / デモデータ / Vercel デプロイ
```

**未実装（Nice to have）**:
- ヨモギ主任アニメーション演出
- 確認督促通知の自動送信

---

## スコープ外（実装しないこと）

- 外部 HR・勤怠システム連携
- 給与計算
- スマートフォンネイティブアプリ
- マルチ施設横断管理
- 制約ルール項目自体の追加（保守対応）
- PDF 出力
- 過去シフトの統計分析
