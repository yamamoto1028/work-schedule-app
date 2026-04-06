# YOMOGI 要件定義書

> 医療介護向け AI シフト管理アプリ  
> Version: 1.1.0 / 作成日: 2026年3月 / ハッカソン期間: 4週間

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術構成](#2-技術構成)
3. [ユーザー・認証](#3-ユーザー認証)
4. [機能要件](#4-機能要件)
5. [データベーススキーマ](#5-データベーススキーマ)
6. [非機能要件](#6-非機能要件)
7. [4週間実装ロードマップ](#7-4週間実装ロードマップ)
8. [Excel出力機能](#8-excel出力機能)
9. [スコープ外](#9-スコープ外ハッカソン期間内)
10. [用語集](#10-用語集)

---

## 1. プロジェクト概要

### 1.1 アプリ概要

| 項目           | 内容                                             |
| -------------- | ------------------------------------------------ |
| アプリ名       | YOMOGI                                           |
| サブタイトル   | 〜愚痴りながら最適解を出すシフト管理 AI〜        |
| ディレクトリ名 | `work-schedule-app`                              |
| 対象ユーザー   | 医療・介護施設のシフト作成管理者 および スタッフ |
| 施設タイプ     | 病院 / 介護施設（切替対応）                      |
| 開発期間       | 4週間（ハッカソン）                              |
| 公開環境       | Vercel（本番）                                   |

### 1.2 コアコンセプト

「こんな無茶なシフト組めるか〜！」とぼやきながら、でもちゃんと最適なシフトを作ってくれる AI アシスタント付きシフト管理アプリ。地獄のシフト作成を「一緒に苦しんでくれる AI がいる」体験に変える。

### 1.3 AI キャラクター「ヨモギ主任」

ベテランお局の主任設定。現場を 20 年以上仕切ってきた、怖いけど絶対頼りになる存在。**基本は安芸弁で話す**。辛辣な口調が基本だが、管理者・スタッフのことはちゃんと褒めてくれる一面がある。施設タイプ（病院 / 介護）によってセリフのトーンが微妙に変わる。

#### 安芸弁の特徴（プロンプト実装参考）

安芸弁は広島県西部（広島市・呉市など）で使われる方言で、一般的に「広島弁」と呼ばれるのはこちら。備後弁と異なり語尾の「ん」をはっきり発音するのが特徴。

| 安芸弁表現                  | 標準語                      | 用例                           |
| --------------------------- | --------------------------- | ------------------------------ |
| 〜じゃけん / 〜じゃけぇ     | 〜だから                    | 「人が足りんけん、組めんのよ」 |
| 〜しんさい / 〜してみんさい | 〜しなさい（柔らかい提案）  | 「ちいと考えてみんさい」       |
| 〜とる                      | 〜ている（結果継続）        | 「もう決まっとるけん」         |
| 〜よる                      | 〜ている（進行中）          | 「あの子、頑張りよるね」       |
| 〜じゃろ                    | 〜でしょう                  | 「無理じゃろ、これ」           |
| 〜のぉ / 〜よぉ             | 〜ね / 〜よ（語尾を伸ばす） | 「困ったのぉ」「そうよぉ」     |
| たいぎい                    | 疲れた・しんどい・面倒      | 「もうたいぎいのぉ」           |
| ぶち〜                      | とても・すごく              | 「ぶち困っとるんよ」           |
| ほいじゃけん                | だから・それだから          | 「ほいじゃけん言うたろうが」   |

#### セリフ例

| 場面             | 病院モード（安芸弁）                                                               | 介護施設モード（安芸弁）                                                    |
| ---------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 希望休が集中     | …全員が土日休みたいんか？ここ病院じゃろうが、ほいじゃけん言うとるんよ。            | もう…みんな揃うて休みたいんじゃけん、たいぎいのぉ。まあ気持ちはわかるけど。 |
| 自動生成完了     | はい、できとるけん。褒めてくれんでもええんよ。ぶち疲れたけん。                     | できとるよぉ。ありがとうはええけん。お茶が飲みたいのぉ。                    |
| スキル不足       | 夜勤に新人3人はさすがに守れんなぁ。研修しんさいよ。                                | この構成じゃと、ご利用者様がぶち心配じゃわ。ちいと考えてみんさい。          |
| 完璧なシフト     | …奇跡的に全員ハッピーになっとるな。スクショしときんさいよ。                        | 珍しぅ綺麗に組めとるんじゃな。あんたもやればできるんよぉ。                  |
| スタッフを褒める | ○○さんはよう頑張りよるけん、この配置が一番ええんよ。                               | ○○さん、いつも丁寧にやっとるけん。ぶちええ仕事しとるよぉ。                  |
| 管理者を褒める   | この調整ができるんは、あんたがしっかりしとるけんじゃな。ほいじゃけん任せとるんよ。 | ようここまで考えとるなぁ。ぶち助かっとるんよぉ、ほんまに。                  |

---

## 2. 技術構成

### 2.1 スタック一覧

| レイヤー       | 技術                                   | 備考                         |
| -------------- | -------------------------------------- | ---------------------------- |
| フロントエンド | Next.js **16**（App Router）           | Vercel デプロイ              |
| スタイリング   | Tailwind CSS **v4** + shadcn/ui        | base-ui ベース（`asChild` 非対応）|
| シフト表 UI    | dnd-kit（カスタムカレンダーグリッド）  | react-big-calendar は不使用  |
| データ取得     | SWR                                    | クライアントキャッシュ・楽観的更新 |
| バックエンド   | Next.js API Routes                     | サーバーレス、別サーバー不要 |
| データベース   | Supabase（PostgreSQL）                 | Auth・Realtime も利用        |
| AI エンジン    | Claude API（claude-sonnet-4-20250514） | ストリーミング対応           |
| メール通知     | Resend                                 | スタッフへのシフト通知       |
| Excel 出力     | ExcelJS                                | サーバーサイド生成のみ       |
| デプロイ       | Vercel                                 | 自動 CI/CD                   |

### 2.2 ディレクトリ構成（推奨）

```
work-schedule-app/
├── app/
│   ├── (auth)/              # ログイン・登録
│   ├── (admin)/             # 管理者画面
│   │   ├── dashboard/
│   │   ├── shifts/          # シフト表・AI生成
│   │   ├── staff/           # スタッフ管理
│   │   └── settings/        # 施設設定・勤務区分・休暇区分・責任者区分・制約設定
│   ├── (staff)/             # スタッフ画面
│   │   ├── my-shifts/       # 自分のシフト確認
│   │   └── requests/        # 休暇申請（区分選択）
│   └── api/
│       ├── shifts/          # シフト CRUD
│       ├── staff/           # スタッフ管理
│       ├── ai/              # AI生成・ストリーミング
│       └── notify/          # 通知送信
├── components/
│   ├── shift-calendar/      # カレンダー関連
│   ├── yomogi/              # ヨモギ主任 UI
│   └── ui/                  # shadcn/ui
├── lib/
│   ├── supabase/            # DB クライアント・型定義
│   ├── ai/                  # Claude API ラッパー・ヨモギ主任プロンプト
│   └── constraints/         # 制約チェックロジック
└── types/                   # 型定義
```

### 2.3 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude API
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 3. ユーザー・認証

### 3.1 ユーザーロール

| ロール            | 概要・権限                                                             |
| ----------------- | ---------------------------------------------------------------------- |
| 管理者（admin）   | シフト作成・編集・承認・公開。スタッフ管理。AI生成実行。施設設定変更。 |
| スタッフ（staff） | 自身のシフト確認。休暇申請（区分選択）。シフト確認（承認）操作。       |

### 3.2 認証フロー

- Supabase Auth を使用（メール＋パスワード認証）
- 管理者とスタッフは同一ログインページからメール + パスワードでログイン
- ロールは DB の `users.role` カラムで管理（`admin` / `staff`）
- セッション管理は Supabase の JWT トークンを使用
- API Routes は全てサーバーサイドで `createServerClient` による認証チェック

#### 3.2.1 施設新規登録フロー

1. `/register` で2ステップフォーム（施設情報 → 管理者アカウント情報）を入力
2. `POST /api/auth/register`（service role）が以下を一括実行：
   - `facilities` INSERT（`plan = 'free'` で作成）
   - `auth.admin.createUser`（`email_confirm: false` で確認メール送信）
   - `users` INSERT（`role = 'admin'`）
   - デフォルトマスタ seed（施設タイプ別：勤務区分・休暇区分・責任者区分・制約設定）
3. 確認メールのリンクをクリック → `/auth/callback` でセッション確立 → `/admin/dashboard` へ
4. **管理者アカウントに `staff_profiles` は作成しない**（シフト管理者と現場職員は別アカウント）

#### 3.2.2 スタッフアカウント追加フロー

- 管理者が `/admin/staff` 画面からスタッフを追加（`supabase.auth.signUp` を使用）
- スタッフには `staff_profiles` が作成され、シフト表に表示される
- **シフト表に表示されるのは `role = 'staff'` のアカウントのみ**（admin は除外）

### 3.3 画面アクセス制御

```
/login              → 未ログイン時のみアクセス可
/register           → 未ログイン時のみアクセス可（施設新規登録）
/auth/callback      → 認証コード交換エンドポイント（メール確認リンク先）
/app/(admin)/**     → role = admin のみ
/app/(staff)/**     → role = staff のみ（自施設データのみ）
```

---

## 4. 機能要件

### 4.1 施設・マスタ設定

管理者が施設ごとに以下をカスタマイズ可能。

#### 4.1.1 施設基本設定

- 施設タイプを「病院」または「介護施設」から選択
- 施設タイプによりヨモギ主任のセリフトーンが切り替わる
- 施設名・ロゴ・基本情報を管理者が設定

#### 4.1.2 勤務区分マスタ（`shift_types`）

- 勤務種別名・略称・色・開始終了時刻をフリー入力で追加・編集・削除
- **各勤務区分を「日中帯（day）」または「夜間帯（night）」に分類する**（制約判定に使用）
  - 例：日中帯 → 早番・日勤・遅番1・遅番2
  - 例：夜間帯 → 夜勤・明け・準夜勤
- 各勤務区分に必要スキルを設定可能

#### 4.1.3 休暇区分マスタ（`leave_types`）

- 施設ごとに利用可能な休暇区分を管理者がオプションで設定・有効化
- デフォルト区分（変更・削除不可）と施設独自区分（自由に追加・編集・削除）に分ける
- スタッフの申請画面では、施設で有効化されている休暇区分のみ選択可能

| 区分キー          | 名称例                               | 種別       |
| ----------------- | ------------------------------------ | ---------- |
| `desired_off`     | 希望休（公休）                       | デフォルト |
| `paid_holiday`    | 有給休暇                             | デフォルト |
| `maternity_leave` | 産前産後休暇                         | デフォルト |
| `childcare_leave` | 育児休業                             | デフォルト |
| `custom_*`        | 施設独自休暇（例：リフレッシュ休暇） | 施設追加   |

#### 4.1.4 責任者区分マスタ（`responsible_roles`）

- 師長・ユニットリーダー・主任など責任者にあたる役職を施設側で名称自由に定義
- 責任者区分ごとに「日中帯への必須配置」「夜間帯への必須配置」を独立してオン / オフ設定
- これにより病院（師長）・介護施設（ユニットリーダー等）どちらにも対応可能

```
設定例：介護施設
  責任者区分: "ユニットリーダー"
    → 日中帯への必須配置: 有効（1名以上）
    → 夜間帯への必須配置: 無効

設定例：病院
  責任者区分: "師長"
    → 日中帯への必須配置: 有効（1名以上）
    → 夜間帯への必須配置: 有効（1名以上）
```

---

### 4.2 スタッフ管理

#### 4.2.1 スタッフ情報

| フィールド       | 内容                                            |
| ---------------- | ----------------------------------------------- |
| 氏名             | 表示名                                          |
| メールアドレス   | ログイン ID 兼通知先                            |
| 電話番号         | 任意                                            |
| 雇用形態         | 常勤 / 非常勤 / パート 等（自由入力）           |
| 役職             | 自由入力 or 施設の責任者区分から選択            |
| 責任者区分       | `responsible_roles` から選択（null = 非責任者） |
| 保有スキル・資格 | 複数選択（施設側でマスタ設定）                  |
| 夜勤可否         | boolean フラグ                                  |
| 月最大勤務数     | 個人設定（施設デフォルト値を上書き）            |
| アカウント状態   | 有効 / 無効                                     |

#### 4.2.2 休暇申請管理

- スタッフが当月・翌月の休暇を申請
  - **休暇区分**を施設で設定されたマスタから選択（有休・希望休・産休 等）
  - 申請日・理由（任意）を入力
  - 自分の申請一覧で区分・日付・承認状況が確認できる
- 管理者が休暇申請一覧を区分・状況でフィルタリングして確認・承認 / 却下
- AI シフト生成時に承認済み休暇申請は制約として反映（区分に関わらず「この日は休み」として扱う）

---

### 4.3 シフト表 UI

#### 4.3.1 表示形式

| 表示モード           | 概要                                           |
| -------------------- | ---------------------------------------------- |
| 月次カレンダービュー | 横軸＝日付、縦軸＝各日のスタッフ一覧（メイン） |
| 一覧リスト表示       | 日付行をリスト形式で展開（印刷・確認用）       |

表示切替ボタンでワンタップ切替。

#### 4.3.2 シフト編集（管理者）

- セルをクリックしてスタッフ・勤務区分を割り当て
- dnd-kit によるドラッグ＆ドロップでシフト移動
- 編集時にリアルタイムで制約チェック、違反があれば警告バッジ表示
- 手動編集と AI 生成結果を混在させて微調整可能

#### 4.3.3 シフト確認（スタッフ）

- 自身のシフトのみを月次カレンダーで確認
- `status = published` のシフトのみ閲覧可能
- 「確認しました」ボタンで `status = confirmed` にマーク

---

### 4.4 AI シフト自動生成（ヨモギ主任）

#### 4.4.1 生成フロー

1. 管理者が対象月・生成条件を確認して「生成開始」ボタンを押す
2. ヨモギ主任パネルが展開し、備後弁のぼやきセリフがストリーミング表示される
3. AI がスタッフ情報・休暇申請・制約ルールを加味して最適シフト案を生成
4. 生成完了後、シフト表プレビューが表示される
5. 管理者が確認・手動調整を行い、承認フローへ進む

#### 4.4.2 AI への入力情報

```typescript
type AIShiftInput = {
  facilityType: "hospital" | "care_facility";
  targetMonth: string; // YYYY-MM
  staff: StaffProfile[]; // スキル・責任者区分・夜勤可否・月最大勤務数
  approvedLeaves: LeaveRequest[]; // 承認済み休暇申請（区分問わず全て）
  constraints: ConstraintSetting[]; // 制約ルール設定
  shiftTypes: ShiftType[]; // 勤務区分マスタ（日中帯/夜間帯の分類含む）
  responsibleRoles: ResponsibleRole[]; // 責任者区分と必須配置設定
  holidays: string[]; // 祝日一覧
};
```

#### 4.4.3 ヨモギ主任 UI の挙動

| タイミング       | 表示内容                                               |
| ---------------- | ------------------------------------------------------ |
| 生成中           | 備後弁のぼやきセリフをストリーミングでリアルタイム表示 |
| 制約違反検出時   | 「これは無理じゃろうが」系の警告セリフ                 |
| 生成完了時       | 「はい、できたけぇ」系の完了セリフ                     |
| 不満スコア表示時 | スタッフ別の辛口コメント（時々褒める）                 |
| 管理者の調整後   | 「よう考えたじゃないか」系の褒めセリフ                 |

施設タイプ（病院 / 介護）でトーン自動切替。

#### 4.4.4 不満スコア可視化

- AI がスタッフごとに「このシフトへの不満度」を 0〜100 でスコアリング
- スコアとともにヨモギ主任の一言コメントを表示（備後弁）
  - 高スコア例：「田中さん、連勤5日はさすがにぶちきつかろうが、たいぎいのぉ」
  - 低スコア例：「山本さんはええ感じじゃけん。よう頑張りよるんよぉ」
- スコアが高いスタッフは赤系でハイライト表示
- シフト全体の不満スコア平均も表示

#### 4.4.5 プロンプト設計方針

```
system: |
  あなたは医療介護施設のベテランお局主任「ヨモギ主任」です。
  施設タイプ: {facilityType}

  【キャラクター設定】
  - 現場を20年以上仕切ってきたベテラン
  - 基本は安芸弁（広島県西部・広島市周辺の方言）で話す
  - 口調は辛辣・ぼやき系だが、管理者とスタッフのことはちゃんと褒める
  - 施設タイプが hospital の場合: よりピリッとした緊張感のある口調
  - 施設タイプが care_facility の場合: 人情味あるぼやき口調

  【安芸弁の特徴】
  - 〜じゃけん / 〜じゃけぇ（〜だから）※「ん」をはっきり発音するのが安芸弁の特徴
  - 〜しんさい / 〜してみんさい（〜しなさい、柔らかい提案）
  - 〜とる（〜ている、結果継続）/ 〜よる（〜ている、進行中）
  - 〜じゃろ（〜でしょう）
  - 〜のぉ / 〜よぉ（語尾を伸ばす）
  - たいぎい（しんどい・面倒）
  - ぶち〜（とても・すごく）
  - ほいじゃけん（だから・それだから）

  【出力フォーマット】
  1. 状況確認のぼやき（制約チェック結果を安芸弁で）
  2. 生成中の進捗コメント（安芸弁）
  3. 完成報告セリフ（安芸弁）
  4. JSON形式のシフトデータ
  5. スタッフ別不満スコアと一言コメント（JSON + 安芸弁）
```

---

### 4.5 制約ルール設定

施設ごとに適用する制約をオン / オフおよびパラメータで設定可能。各制約は `constraint_settings` テーブルの `is_enabled` と `value（JSONB）` で管理する。  
**制約項目自体の追加は保守対応とする。**

制約は以下の5カテゴリに分類する。

---

#### カテゴリ A：連勤・休日ルール

| constraint_key               | デフォルト値 | 設定可能範囲 | 説明                                                         |
| ---------------------------- | ------------ | ------------ | ------------------------------------------------------------ |
| `rest_after_night_off`       | 有効         | 有効 / 無効  | 夜勤明けの翌日は必ず休みにする（明け → 休の強制）            |
| `no_day_shift_after_night`   | 有効         | 有効 / 無効  | 夜間帯勤務翌日の日中帯シフトを禁止（`time_zone` 分類を適用） |
| `max_consecutive_day_only`   | 3日          | 1〜14日      | 日中帯勤務のみのスタッフの連勤上限（超えたら翌日休みを挿入） |
| `max_consecutive_with_night` | 4日          | 1〜14日      | 夜勤あり（夜勤明け含む）スタッフの連勤上限                   |
| `max_consecutive_days`       | 5日          | 1〜14日      | 全スタッフ共通の連続勤務の最大日数（上記2つより優先度低）    |
| `min_days_off_per_month`     | 8日/月       | 0〜31日      | 月間最低休日保証日数                                         |
| `min_weekly_days_off`        | 2日/週       | 0〜7日       | 週あたり最低休日数                                           |
| `max_monthly_shifts`         | 22日         | 1〜31日      | 月最大勤務数（スタッフ個人設定で上書き可）                   |

> `rest_after_night_off` と `no_day_shift_after_night` は併用可能。前者は明けの翌日を完全休日に固定し、後者は日中帯配置を禁止する（明けを置くことは許容）。

---

#### カテゴリ B：夜勤回数・配置ルール

| constraint_key                   | デフォルト値 | 設定可能範囲                 | 説明                                                                                  |
| -------------------------------- | ------------ | ---------------------------- | ------------------------------------------------------------------------------------- |
| `night_shift_equal_distribution` | 有効         | 有効 / 無効                  | 夜勤対象スタッフ間で夜勤回数をできる限り均等配分する                                  |
| `night_shift_min_per_role`       | 無効         | 有効 / 無効 + 役職別回数指定 | 役職（主任・副主任等）ごとに月間夜勤最低回数を設定。例：主任・副主任は3回             |
| `night_shift_fixed_per_staff`    | 無効         | 有効 / 無効                  | 個人に指定した夜勤回数をそのまま配置する（`staff_profiles.fixed_night_count` と連動） |
| `max_night_shifts_per_month`     | 8回          | 0〜31回                      | 月あたりの夜間帯勤務上限（全スタッフ共通）                                            |
| `night_responsible_roles`        | 無効         | 有効 / 無効 + 役職リスト指定 | 夜勤責任者として認める役職を設定（主任・副主任以外も追加可能）                        |

---

#### カテゴリ C：シフト人数・構成ルール

| constraint_key                   | デフォルト値               | 設定可能範囲            | 説明                                                            |
| -------------------------------- | -------------------------- | ----------------------- | --------------------------------------------------------------- |
| `min_staff_per_shift`            | 施設設定依存               | 0〜99名（勤務区分ごと） | 各勤務区分の1日最低出勤人数（勤務区分マスタと連動して個別設定） |
| `max_staff_per_shift`            | 無制限                     | 0〜99名（勤務区分ごと） | 各勤務区分の1日最大出勤人数。例：遅番は2名まで                  |
| `max_staff_per_shift_exception`  | 無効                       | 有効 / 無効 + 例外人数  | 特定条件下での最大人数の例外を許可。例：新人指導時は遅番3名OK   |
| `require_responsible_role_day`   | 責任者区分マスタ設定に依存 | 有効 / 無効 / 人数指定  | 日中帯への責任者必須配置（責任者区分マスタと連動）              |
| `require_responsible_role_night` | 責任者区分マスタ設定に依存 | 有効 / 無効 / 人数指定  | 夜間帯への責任者必須配置（責任者区分マスタと連動）              |
| `require_skill_match`            | 有効                       | 有効 / 無効             | 勤務区分に必要スキル保有者を必ず配置する                        |

---

#### カテゴリ D：スタッフ属性別制約

| constraint_key                 | デフォルト値 | 設定可能範囲 | 説明                                                                                                               |
| ------------------------------ | ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `half_staff_isolation`         | 有効         | 有効 / 無効  | 半人前職員（新人含む）を同一シフトに複数配置しない。やむを得ず配置する場合は1名多くフル職員を追加する              |
| `committee_day_shift_required` | 有効         | 有効 / 無効  | 委員会担当スタッフは委員会会議開催日に日中帯勤務区分のシフトを割り当てる（`committee_assignments` テーブルと連動） |

> `half_staff_isolation` の「半人前職員」は `staff_profiles.staff_grade = 'half'` のスタッフを対象とする。新人（`staff_grade = 'new'`）は自動的に半人前として扱う。

---

#### カテゴリ E：施設固有行事・日程ルール

| constraint_key                | デフォルト値         | 設定可能範囲                   | 説明                                                             |
| ----------------------------- | -------------------- | ------------------------------ | ---------------------------------------------------------------- |
| `bathing_day_enabled`         | 無効                 | 有効 / 無効                    | 入浴日の設定を有効化する（`facility_events` テーブルに日程登録） |
| `bathing_day_is_linen_change` | 有効（入浴日有効時） | 有効 / 無効                    | 入浴日をリネン交換日として扱う（シフト備考に自動表示）           |
| `bathing_day_extra_staff`     | 無効                 | 有効 / 無効 + 勤務区分別増員数 | 入浴介助ヘルプが必要な入浴日に各勤務区分の人数を増員する         |

---

#### 制約の適用優先度

複数の制約が競合する場合、以下の優先度で処理する。

```
1. 個人固定設定（fixed_night_count、個人max_monthly_shifts）
2. 強制休日ルール（rest_after_night_off）
3. 連勤上限（max_consecutive_with_night > max_consecutive_day_only > max_consecutive_days）
4. 人数・構成ルール（min/max_staff_per_shift）
5. 均等配分・属性ルール（night_shift_equal_distribution、half_staff_isolation）
6. 委員会・行事ルール（committee_day_shift_required、bathing_day_*）
```

---

#### 関連するDB追加テーブル・カラム

制約の新規対応に伴い、以下のテーブル・カラムを追加する。

```sql
-- staff_profiles への追加カラム
alter table staff_profiles add column staff_grade text not null default 'full'
  check (staff_grade in ('full', 'half', 'new'));
  -- full=フル職員 / half=半人前 / new=新人（halfに含まれる）
alter table staff_profiles add column fixed_night_count integer;
  -- null=均等配分 / 数値=この回数を固定で夜勤に入れる

-- 委員会担当テーブル
create table committee_assignments (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references facilities(id),
  user_id         uuid not null references users(id),
  committee_name  text not null,       -- 委員会名（感染対策委員会 等）
  meeting_dates   date[] not null default '{}', -- 当月の会議開催日一覧
  created_at      timestamptz not null default now()
);

-- 施設行事テーブル（入浴日・リネン交換日等）
create table facility_events (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references facilities(id),
  event_type    text not null check (event_type in ('bathing', 'linen', 'custom')),
  event_name    text not null,
  date          date not null,
  extra_staff   jsonb default '{}',   -- 勤務区分別増員数 {"shift_type_id": 増員数}
  note          text,
  created_at    timestamptz not null default now()
);
```

---

### 4.6 承認・公開フロー

```
[管理者] シフト作成・調整
    ↓
[管理者] 「承認・公開」ボタン押下
    ↓
[システム] status を draft → published に更新
    ↓
[システム] スタッフへ通知（メール + アプリ内）
    ↓
[スタッフ] ログインしてシフト確認
    ↓
[スタッフ] 「確認しました」ボタン → status = confirmed
    ↓
[管理者] 確認状況を一覧で把握
```

> **注意**: 公開前（`status = draft`）のシフトはスタッフには非表示。管理者のみ閲覧・編集可能。

---

### 4.7 通知

| 通知種別         | 対象 / 内容                                   | 手段              |
| ---------------- | --------------------------------------------- | ----------------- |
| シフト公開通知   | 全スタッフ：翌月シフトが公開されました        | メール + アプリ内 |
| シフト変更通知   | 変更対象スタッフ：シフトが変更されました      | メール + アプリ内 |
| 休暇申請承認通知 | 申請スタッフ：{区分名}が承認 / 却下されました | メール + アプリ内 |
| 確認督促通知     | 未確認スタッフ：シフト確認をお願いします      | メール + アプリ内 |

- **メール通知**: Resend を使用
- **アプリ内通知**: Supabase Realtime を使用（ベルアイコン）

---

## 5. データベーススキーマ

### 5.1 ER 概要

```
facilities
  ├─< users (facility_id)
  │     ├─< staff_profiles (user_id)
  │     ├─< shifts (user_id)
  │     └─< leave_requests (user_id)
  ├─< shift_types (facility_id)         # 勤務区分マスタ（日中帯/夜間帯分類あり）
  ├─< leave_types (facility_id)         # 休暇区分マスタ
  ├─< responsible_roles (facility_id)   # 責任者区分マスタ
  └─< constraint_settings (facility_id)
```

### 5.2 テーブル定義

#### `facilities`（施設）

```sql
create table facilities (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null check (type in ('hospital', 'care_facility')),
  logo_url     text,
  created_at   timestamptz not null default now()
);
```

#### `users`（ユーザー）

```sql
create table users (
  id           uuid primary key references auth.users(id),
  facility_id  uuid not null references facilities(id),
  email        text not null unique,
  display_name text not null,
  role         text not null check (role in ('admin', 'staff')),
  avatar_url   text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
```

#### `staff_profiles`（スタッフプロフィール）

```sql
create table staff_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id),
  facility_id         uuid not null references facilities(id),
  employment_type     text,                       -- 常勤 / 非常勤 / パート 等
  position            text,                       -- 役職（自由入力）
  responsible_role_id uuid references responsible_roles(id), -- null=非責任者
  skills              text[] default '{}',
  can_night_shift     boolean not null default true,
  max_monthly_shifts  integer,                    -- null=施設デフォルト値を使用
  phone               text,
  updated_at          timestamptz not null default now()
);
```

#### `shift_types`（勤務区分マスタ）

```sql
create table shift_types (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references facilities(id),
  name            text not null,                  -- 早番 / 日勤 / 夜勤 等（自由入力）
  short_name      text not null,                  -- シフト表略称
  color           text not null default '#4472C4',
  start_time      time,
  end_time        time,
  time_zone       text not null check (time_zone in ('day', 'night')),
                                                  -- day=日中帯 / night=夜間帯
  required_skills text[] default '{}',
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
```

#### `leave_types`（休暇区分マスタ）

```sql
create table leave_types (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references facilities(id),
  key          text not null,                     -- desired_off / paid_holiday / custom_* 等
  name         text not null,                     -- 表示名
  color        text not null default '#888888',
  is_default   boolean not null default false,    -- true=デフォルト区分（削除不可）
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (facility_id, key)
);
```

#### `responsible_roles`（責任者区分マスタ）

```sql
create table responsible_roles (
  id                       uuid primary key default gen_random_uuid(),
  facility_id              uuid not null references facilities(id),
  name                     text not null,         -- 師長 / ユニットリーダー / 主任 等
  color                    text not null default '#E25822',
  require_day_zone         boolean not null default true,
  require_day_zone_count   integer not null default 1,
  require_night_zone       boolean not null default false,
  require_night_zone_count integer not null default 1,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now()
);
```

#### `shifts`（シフト）

```sql
create table shifts (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid not null references facilities(id),
  user_id        uuid not null references users(id),
  shift_type_id  uuid not null references shift_types(id),
  date           date not null,
  status         text not null default 'draft'
                   check (status in ('draft', 'published', 'confirmed')),
  note           text,
  created_by     uuid references users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (facility_id, user_id, date)
);
```

#### `leave_requests`（休暇申請）

```sql
create table leave_requests (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid not null references facilities(id),
  user_id        uuid not null references users(id),
  leave_type_id  uuid not null references leave_types(id), -- 休暇区分（必須）
  date           date not null,
  reason         text,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  reviewed_by    uuid references users(id),
  created_at     timestamptz not null default now()
);
```

#### `constraint_settings`（制約設定）

```sql
create table constraint_settings (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references facilities(id),
  constraint_key  text not null,
  is_enabled      boolean not null default true,
  value           jsonb not null default '{}',
  updated_at      timestamptz not null default now(),
  unique (facility_id, constraint_key)
);
```

### 5.3 RLS ポリシー方針

```sql
-- facilities          : 自施設のみ参照可
-- users               : 同一施設のみ参照可（管理者は全員、スタッフは自分のみ更新）
-- staff_profiles      : 管理者は全件 / スタッフは自分のみ
-- shift_types         : 管理者は全件操作 / スタッフは参照のみ
-- leave_types         : 管理者は全件操作 / スタッフは参照のみ
-- responsible_roles   : 管理者は全件操作 / スタッフは参照のみ
-- shifts              : 管理者は全件 / スタッフは自分の published 以降のみ参照
-- leave_requests      : 管理者は全件 / スタッフは自分の申請のみ
-- constraint_settings : 管理者のみ読み書き
```

---

## 6. 非機能要件

### 6.1 パフォーマンス

| 指標                      | 目標値                        |
| ------------------------- | ----------------------------- |
| シフト表初期表示          | 2秒以内                       |
| AI 生成（初回レスポンス） | 3秒以内（ストリーミング開始） |
| D&D 操作                  | 遅延なし（60fps）             |
| API レスポンス全般        | 500ms以内                     |

### 6.2 セキュリティ

- Supabase RLS で施設データを完全分離
- API Routes はサーバーサイドで毎回認証・ロールチェック
- 環境変数に機密情報を格納（`.env.local`、Vercel 環境変数）
- `SUPABASE_SERVICE_ROLE_KEY` はサーバーサイドのみで使用

### 6.3 レスポンシブ対応

| ブレークポイント          | 対象                                   |
| ------------------------- | -------------------------------------- |
| PC（1280px〜）            | メイン開発ターゲット。フルレイアウト。 |
| タブレット（768px〜）     | シフト表の横スクロール対応             |
| スマートフォン（〜767px） | スタッフの確認・申請画面のみ最適化     |

### 6.4 アクセシビリティ

- カラーコーディングに依存しない情報表現（勤務区分の略称を必ず併用）
- キーボードナビゲーション対応

---

## 7. 4週間実装ロードマップ

| 週     | テーマ   | 主な実装内容                                                                                                                                                                    | マイルストーン                                       |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Week 1 | 基盤構築 | Next.js + Supabase セットアップ / DB マイグレーション / Supabase Auth / スタッフ CRUD / 勤務区分・休暇区分・責任者区分マスタ設定 / 施設設定画面                                 | 手動でシフトが保存できる状態                         |
| Week 2 | コア機能 | 月次カレンダービュー / dnd-kit D&D 編集 / 制約リアルタイムチェック（日中帯・夜間帯分類対応）/ 承認・公開フロー / Resend メール通知 / Supabase Realtime 通知                     | シフト調整〜承認〜通知が動く状態                     |
| Week 3 | AI / UX  | Claude API ストリーミング / ヨモギ主任パネル UI（安芸弁） / 施設タイプ別プロンプト切替 / AI シフト自動生成 / 不満スコア可視化 / 一覧リスト表示                                  | ヨモギ主任が安芸弁でぼやきながらシフト生成できる状態 |
| Week 4 | 仕上げ   | エラーハンドリング / ローディング・空状態 UI / レスポンシブ対応 / ヨモギ主任アニメーション / **Excel出力機能（ExcelJS）** / デモ用シードデータ / Vercel 本番デプロイ / 発表資料 | 審査員の前で迷わずデモできる完成状態                 |

### 実装優先度

```
Must（必須）
  ├── スタッフ管理 CRUD
  ├── 勤務区分マスタ（日中帯/夜間帯分類）
  ├── 休暇区分マスタ + 休暇申請（区分選択）
  ├── 責任者区分マスタ + 必須配置設定
  ├── シフト表カレンダー UI（D&D）
  ├── AI シフト生成 + ヨモギ主任ストリーミング（備後弁）
  ├── 承認・公開フロー
  └── メール通知

Should（できれば）
  ├── 不満スコア可視化
  ├── アプリ内リアルタイム通知
  ├── 一覧リスト表示モード
  └── Excel出力機能（ExcelJS）

Nice to have（余裕があれば）
  ├── ヨモギ主任アニメーション演出
  └── 確認督促通知の自動送信
```

---

## 8. Excel出力機能

### 8.1 概要

管理者が生成・確定したシフト表を Excel（`.xlsx`）形式でダウンロードできる機能。印刷・外部共有・他システムへの取り込みを想定。

### 8.2 出力トリガー

- シフト表画面（管理者のみ）に「Excel 出力」ボタンを設置
- `status = published` または `status = confirmed` のシフトが出力対象
- 対象月を選択してダウンロード

### 8.3 出力フォーマット

#### シート構成

| シート名              | 内容                                   |
| --------------------- | -------------------------------------- |
| `{YYYY年M月}シフト表` | メインのシフト表（カレンダー形式）     |
| `スタッフ一覧`        | 出力月のスタッフ情報・勤務集計サマリー |

#### メインシート（シフト表）レイアウト

```
        | 1(月) | 2(火) | 3(水) | ... | 31(日) | 出勤日数 | 日中帯 | 夜間帯 |
--------|-------|-------|-------|-----|--------|----------|--------|--------|
山田 太郎 |  日勤  |  休み  |  夜勤  | ... |  早番   |   20    |   16   |    4   |
田中 花子 |  夜勤  |  明け  |  休み  | ... |  日勤   |   18    |   14   |    4   |
...
--------|-------|-------|-------|-----|--------|----------|--------|--------|
出勤人数  |   5   |   4   |   6   | ... |   5    |          |        |        |
```

- 横軸：日付（1〜末日）+ 曜日
- 縦軸：スタッフ名（役職順 → 五十音順）
- セル値：勤務区分の略称（早・日・夜・明 等）または「休」「有」「産」「育」等（休暇区分の略称）
- セル背景色：勤務区分・休暇区分に設定した色を適用
- 列末：スタッフごとの月間集計（出勤日数・日中帯日数・夜間帯日数）
- 行末：日付ごとの出勤人数集計
- 土曜：列背景を薄青、日曜・祝日：列背景を薄赤でハイライト

#### スタッフ一覧シート

| 氏名 | 役職 | 雇用形態 | 出勤日数 | 日中帯 | 夜間帯 | 休暇日数 | 有休消化数 |
| ---- | ---- | -------- | -------- | ------ | ------ | -------- | ---------- |

### 8.4 技術実装方針

フロントエンド（Next.js）から API Route を叩き、サーバーサイドで Excel を生成してバイナリレスポンスとして返す。

#### 使用ライブラリ

```
ExcelJS（npm: exceljs）
- セル単位のスタイル・色・罫線設定が可能
- ストリーミングレスポンス対応
- Node.js サーバーサイドで動作
```

#### API Route 設計

```
GET /api/shifts/export?month=YYYY-MM&facilityId=xxx
  → Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  → Content-Disposition: attachment; filename="YOMOGI_YYYY年M月シフト表.xlsx"
```

#### 実装フロー

```typescript
// app/api/shifts/export/route.ts

import ExcelJS from "exceljs";

export async function GET(req: Request) {
  // 1. 認証チェック（admin のみ）
  // 2. クエリパラメータから month・facilityId を取得
  // 3. Supabase からシフト・スタッフ・休暇データを取得
  // 4. ExcelJS で Workbook を生成
  //    - シフト表シート：カレンダー形式、セル色・罫線適用
  //    - スタッフ一覧シート：集計サマリー
  // 5. バッファに書き出して Response で返す

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "YOMOGI";

  // バッファ生成
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
```

#### スタイリングルール

| 要素                     | スタイル                                           |
| ------------------------ | -------------------------------------------------- |
| ヘッダー行（日付）       | 背景：ダークグレー、文字：白、中央揃え、太字       |
| ヘッダー列（スタッフ名） | 背景：ライトグレー、左揃え、太字                   |
| 勤務セル                 | 勤務区分の設定色を背景に、略称を中央揃えで表示     |
| 休暇セル                 | 休暇区分の設定色を背景に、略称を中央揃えで表示     |
| 土曜列                   | 列全体の背景を薄青（`D6E4F0`）                     |
| 日曜・祝日列             | 列全体の背景を薄赤（`FAD7D7`）                     |
| 集計列・行               | 背景：薄黄（`FFFDE7`）、太字、Excel SUM 数式を使用 |
| 罫線                     | 全セルに細線（`thin`）                             |
| フォント                 | Arial 10pt 統一                                    |

### 8.5 ファイル名規則

```
YOMOGI_{YYYY}年{M}月シフト表_{出力日時YYYYMMDD}.xlsx
例: YOMOGI_2026年4月シフト表_20260322.xlsx
```

### 8.6 DB 追加不要

Excel 出力はシフト・スタッフ・休暇テーブルの既存データから動的生成するため、新規テーブルは不要。

---

## 9. マネタイズ設計

### 9.1 プラン概要

| プラン | 料金 | ターゲット |
|---|---|---|
| **Free** | 無料 | 小規模施設・お試し・個人 |
| **Pro** | 月3,980円 / 施設 | 中規模施設・本格運用 |
| **Enterprise** | 月5,980~ | 大規模・複数施設展開 |

Enterpriseを「複数ブロック版のPro」として考えると価格の説明が直感的。
Pro（1ブロック）   ：月3,980円
Enterprise         ：月3,980円 × ブロック数 × 0.7〜0.8（ボリューム割引）
ブロック数単純積み上げボリューム割引（25%OFF）訴求2ブロック7,960円月5,980円2ブロックでもProの1.5倍3ブロック11,940円月7,980円3ブロックでもProの2倍5ブロック19,900円月12,800円まとめるほどお得10ブロック39,800円月24,800円大型施設向け


### 9.2 機能別プラン対応表

| 機能 | Free | Pro | Enterprise |
|---|---|---|---|
| スタッフ管理 CRUD | ✅ | ✅ | ✅|
| 勤務区分・休暇区分・責任者区分マスタ設定 | ✅ | ✅ | ✅|
| 制約設定（オン/オフ・パラメータ） | ✅ | ✅ | ✅|
| シフト手動作成・D&D 編集 | ✅ | ✅ | ✅|
| 制約チェック リアルタイム表示 | ✅ | ✅ | ✅|
| シフト表閲覧（スタッフ側） | ✅ | ✅ | ✅|
| 希望休・休暇申請 | ✅ | ✅ | ✅|
| **AI シフト自動生成（ヨモギ主任）** | ❌ | ✅ | ✅|
| **不満スコア可視化** | ❌ | ✅ | ✅|
| **メール通知送信（Resend）** | ❌ | ✅ | ✅ |
| **アプリ内 Realtime 通知** | ❌ | ✅ | ✅ |
| **Excel 出力** | ✅ | ✅ | ✅ |
| **複数フロア・ブロックの管理** | ❌ | ❌ | ✅ |

> **設計思想**: 無料プランは「手書きより楽・制約を見ながら組める」だけで十分な価値を持つ。有料プランはAI生成（Claude APIコスト）とメール通知（Resendコスト）という主な運用コスト発生機能に対応させ、コスト構造と収益が自然に対応する設計とする。

### 9.3 DB 実装方針
```sql
-- facilities テーブルの plan カラム（migration 011〜013 で実装済み）
-- default 'free', check (plan in ('free', 'pro', 'enterprise'))
-- ※ 'basic' は廃止。migration 012 で 'free' に移行済み
```

### 9.4 バックエンドのプランチェック方針

Pro 限定機能の API Route は必ず以下のチェックを行う。
```typescript
// lib/plan/check.ts
export async function requireProPlan(facilityId: string) {
  const { data } = await supabase
    .from('facilities')
    .select('plan')
    .eq('id', facilityId)
    .single();

  if (data?.plan !== 'pro' && data?.plan !== 'enterprise') {
    throw new Error('この機能はProプラン以上でご利用いただけます');
  }
}

// 使用例: app/api/ai/route.ts
await requireProPlan(facilityId);  // ← Pro機能の先頭で必ず呼ぶ
```

対象 API Route:
- `app/api/ai/` — AI シフト自動生成・不満スコア
- `app/api/notify/` — メール通知・Realtime 通知
- `app/api/shifts/export/` — Excel 出力

### 9.5 フロントエンドのプランゲート方針

- Pro 限定 UI 要素は**ロック状態で表示**し、クリック時にアップグレードモーダルを表示する
- 「使えない」ではなく「Pro にするとこれが使える」という導線にする
- `facilities.plan` を Context または Server Component で取得し、`<PlanGate plan="pro">` のようなラッパーコンポーネントで制御する
```typescript
// components/plan/PlanGate.tsx
type Props = {
  plan: 'pro' | 'enterprise';
  currentPlan: string;
  children: React.ReactNode;
};

export function PlanGate({ plan, currentPlan, children }: Props) {
  const hasAccess =
    currentPlan === plan ||
    currentPlan === 'enterprise';

  if (!hasAccess) {
    return <UpgradePrompt requiredPlan={plan} />;
  }
  return <>{children}</>;
}
```

### 9.6 決済（ハッカソンスコープ外）

実際の課金処理（Stripe 等）はハッカソン期間内のスコープ外とする。ハッカソン期間中は `facilities.plan` を管理者が手動で変更することでプランを切り替えて動作確認する。

---

## 10. スコープ外（ハッカソン期間内）

- 外部 HR システム・勤怠システムとの連携
- 給与計算機能
- スマートフォンネイティブアプリ（iOS / Android）
- マルチ施設管理（複数施設の横断管理）
- 制約ルール項目の管理者による追加・カスタマイズ（保守対応）
- PDF 出力・印刷最適化
- 過去シフトの統計分析・レポート機能

---

## 11. 用語集

| 用語            | 定義                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| YOMOGI          | 本アプリの名称。                                                                                               |
| ヨモギ主任      | AI シフト生成アシスタントのキャラクター。安芸弁を話すベテランお局主任設定。辛辣だが管理者・スタッフを褒める。  |
| 勤務区分        | 早番・日勤・夜勤など施設ごとに自由設定できるシフト種別。                                                       |
| 日中帯（day）   | 勤務区分の時間帯分類。早番・日勤・遅番など日中の勤務。制約判定に使用。                                         |
| 夜間帯（night） | 勤務区分の時間帯分類。夜勤・明け・準夜勤など夜間の勤務。制約判定に使用。                                       |
| 休暇区分        | 希望休・有休・産休・育休・施設独自休暇など休暇の種類。施設ごとにマスタ管理。                                   |
| 責任者区分      | 師長・ユニットリーダー等の責任者役職を施設が定義したもの。日中帯・夜間帯への必須配置を個別設定可能。           |
| 夜勤責任者      | 夜間帯シフトの責任者。主任・副主任がデフォルトだが、施設設定で追加指定可能（`night_responsible_roles` 制約）。 |
| フル職員        | `staff_grade = 'full'`。1人換算できる通常職員。                                                                |
| 半人前職員      | `staff_grade = 'half'`。1人換算できない職員。同一シフトに複数配置しない制約が適用される。                      |
| 新人            | `staff_grade = 'new'`。半人前職員に含まれる。同制約が適用される。                                              |
| 委員会担当      | `committee_assignments` で管理。会議開催日は日中帯シフトが必須となる。                                         |
| 入浴日          | `facility_events.event_type = 'bathing'`。リネン交換日と兼用可。入浴介助ヘルプ日は増員対応可。                 |
| 不満スコア      | AI がスタッフの立場から算出するシフトへの満足度逆数指標（0〜100）。                                            |
| RLS             | Row Level Security：Supabase の行単位アクセス制御機能。                                                        |
| draft           | シフトの下書き状態。スタッフには非表示。                                                                       |
| published       | シフトが公開された状態。スタッフが閲覧・確認可能。                                                             |
| confirmed       | スタッフがシフトを確認済みにした状態。                                                                         |
| 安芸弁          | 広島県西部（広島市・呉市周辺）の方言。一般的に「広島弁」と呼ばれるのはこちら。ヨモギ主任が使う言葉。           |
