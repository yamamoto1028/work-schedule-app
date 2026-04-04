<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# YOMOGI — エージェント構成ガイド

Claude Code でタスクを実行する際の役割分担・実行ルール・禁止事項を定義する。  
各エージェントは作業開始前に必ず `REQUIREMENTS.md` の該当セクションを確認すること。
チャットは日本語で対応すること。

---

## エージェント構成

### 1. DB エージェント

**担当範囲**: Supabase スキーマ・マイグレーション・RLS

**参照先**: `REQUIREMENTS.md 5`（データベーススキーマ）

**責務**:

- `supabase/migrations/` 配下に新しいマイグレーションファイルを作成する
- RLS ポリシーの追加・変更を行う
- `supabase gen types typescript` で `types/database.ts` を再生成する
- `constraint_settings` テーブルへのデフォルト値の seed 投入

**実行順序の原則**:

- スキーマ変更は必ずフロントエンド実装より先に行う
- マイグレーションファイルは直接編集しない。変更が必要な場合は新しいファイルを作成する
- RLS ポリシーは `REQUIREMENTS.md 5.3` の方針に従い、施設データの完全分離を保証する

**完了条件**:

- `supabase db push` がエラーなく完了する
- `supabase gen types typescript` で型が正しく生成される
- 全テーブルに RLS が有効になっている

---

### 2. 認証・ルーティングエージェント

**担当範囲**: Supabase Auth・プロキシ・画面アクセス制御

**参照先**: `REQUIREMENTS.md 3`（ユーザー・認証）

**責務**:

- **`proxy.ts`（プロジェクトルート）** でセッション検証とロールベースのリダイレクトを実装する（Next.js 16 の規約。`middleware.ts` は廃止）
- エクスポート関数名は `proxy`（`middleware` ではない）
- `lib/supabase/server.ts` / `client.ts` / `middleware.ts` のクライアント分離を管理する
- ログイン画面 `app/(auth)/login` の実装
- 管理者・スタッフそれぞれのルートガード実装（各 layout.tsx でロールチェック）

**アクセス制御ルール**:

```
/app/(auth)/login   → 未ログイン時のみ
/app/(admin)/**     → role = admin のみ
/app/(staff)/**     → role = staff のみ（自施設データのみ）
```

**禁止事項**:

- `SUPABASE_SERVICE_ROLE_KEY` をクライアントサイドで使用すること
- ミドルウェアでロールチェックを省略すること

**完了条件**:

- 未ログイン状態でのアクセスがログインページにリダイレクトされる
- 管理者アカウントでスタッフ画面にアクセスしたときに 403 またはリダイレクトされる
- スタッフアカウントで管理者画面にアクセスしたときに同様の制御がかかる

---

### 3. マスタ設定エージェント

**担当範囲**: 施設設定・勤務区分・休暇区分・責任者区分・制約設定の管理画面

**参照先**: `REQUIREMENTS.md 4.1`（施設・マスタ設定）、`REQUIREMENTS.md 4.5`（制約ルール設定）

**責務**:

- `app/(admin)/settings/` 配下の各設定画面を実装する
- 勤務区分の CRUD（`time_zone: day/night` の分類選択 UI を含む）
- 休暇区分の CRUD（デフォルト区分は削除不可のロック制御）
- 責任者区分の CRUD（日中帯・夜間帯の必須配置オン/オフ設定）
- 制約設定の一覧・オン/オフ切替・パラメータ編集画面

**制約設定 UI の注意点**:

- `constraint_settings` テーブルの `constraint_key` は固定値。UI で自由入力させない
- 各制約の `value (jsonb)` に格納するパラメータ構造は `REQUIREMENTS.md 4.5` の各テーブルを参照
- 制約項目の追加は保守対応のため、UI に「追加」ボタンは設置しない

**完了条件**:

- 各マスタの CRUD が正常に動作する
- 勤務区分に `time_zone` が必ず設定されている
- 制約設定の変更が `constraint_settings` テーブルに正しく反映される

---

### 4. スタッフ管理エージェント

**担当範囲**: スタッフ一覧・登録・編集・休暇申請管理

**参照先**: `REQUIREMENTS.md 4.2`（スタッフ管理）

**責務**:

- `app/(admin)/staff/` 配下のスタッフ管理画面を実装する
- スタッフ CRUD（`staff_grade: full/half/new`・`fixed_night_count` の設定 UI を含む）
- 委員会担当の割り当て画面（`committee_assignments` テーブル）
- 休暇申請の一覧・承認 / 却下画面（区分フィルタリング付き）
- `app/(staff)/requests/` のスタッフ側休暇申請フォーム（休暇区分選択必須）

**staff_grade の扱い**:

```
full  = フル職員（1人換算可）
half  = 半人前職員（1人換算不可）
new   = 新人（half として扱う）
```

**完了条件**:

- スタッフの `staff_grade` と `fixed_night_count` が正しく設定・保存できる
- 休暇申請に休暇区分（`leave_type_id`）が必ず紐付いている
- 管理者が休暇申請を承認/却下するとスタッフへ通知が送られる

---

### 5. シフト表 UI エージェント

**担当範囲**: カレンダービュー・D&D 編集・一覧リスト表示

**参照先**: `REQUIREMENTS.md 4.3`（シフト表 UI）

**責務**:

- `app/(admin)/shifts/` の月次カレンダービュー実装（**react-big-calendar は不使用。dnd-kit + カスタムグリッド**）
- dnd-kit によるドラッグ＆ドロップでのシフト移動
- 編集時のリアルタイム制約チェック（`lib/constraints/` を呼び出す）
- 制約違反時の警告バッジ表示
- 一覧リスト表示モード（月次カレンダーとの切替）✅ 実装済み
- `app/(staff)/my-shifts/` のスタッフ用シフト確認画面（`published` 以降のみ表示、`?month=YYYY-MM` で過去月も閲覧可）
- シフトデータは **SWR** で取得・キャッシュ。月移動時はキャッシュヒットで即時表示

**カレンダーレイアウト仕様**:

```
横軸 = 日付（1〜末日）
縦軸 = スタッフ一覧
セル = 勤務区分の略称 + 設定色で表示
フッター = 日中帯人数（amber）/ 夜間帯人数（indigo）の行（「明け」は夜間帯から除外）
```

**SWR の使い方**:

```typescript
const { data: shiftsData, isLoading, mutate: mutateShifts } = useSWR(key, fetcher, options)
const shifts = useMemo(() => shiftsData ?? [], [shiftsData])
// 楽観的更新: await mutateShifts(prev => updater(prev), false)
// 再フェッチ:  await mutateShifts()
```

**制約チェックのタイミング**:

- セルへの割り当て時（ドラッグ完了時・クリック確定時）にリアルタイムで実行
- 違反がある場合は該当セルに警告バッジを表示し、保存はブロックしない（警告のみ）

**完了条件**:

- 月次カレンダーでシフトの表示・割り当て・移動ができる
- 制約違反時に警告が表示される
- スタッフ画面で自分の `published` シフトのみ閲覧できる（過去月も参照可）

---

### 6. 承認フロー・通知エージェント

**担当範囲**: シフト承認・公開・スタッフへの通知

**参照先**: `REQUIREMENTS.md 4.6`（承認・公開フロー）、`REQUIREMENTS.md 4.7`（通知）

**責務**:

- 「承認・公開」ボタンで `shifts.status` を `draft → published` に一括更新する API
- 公開時に全スタッフへメール通知を送信（Resend）
- Supabase Realtime でアプリ内通知（ベルアイコン）を実装する
- スタッフの「確認しました」ボタンで `status = confirmed` に更新する API
- 管理者が確認状況を一覧で把握できる画面

**通知の種類と送信タイミング**:

```
シフト公開通知     → 管理者が「承認・公開」を押したとき（全スタッフ）
シフト変更通知     → 公開済みシフトを変更したとき（変更対象スタッフ）
休暇申請承認通知   → 管理者が申請を承認/却下したとき（申請スタッフ）
確認督促通知       → 手動またはタイマー（未確認スタッフ）
```

**完了条件**:

- 公開操作で全スタッフにメールが届く
- Realtime でアプリ内通知がリアルタイムに表示される
- スタッフが確認ボタンを押すと管理者の確認状況一覧が更新される

---

### 7. AI・ヨモギ主任エージェント

**担当範囲**: Claude API 連携・ヨモギ主任 UI・シフト自動生成・不満スコア

**参照先**: `REQUIREMENTS.md 4.4`（AI シフト自動生成）

**責務**:

- `app/api/ai/route.ts` で Claude API ストリーミングレスポンスを実装
- `lib/ai/prompt.ts` にヨモギ主任のシステムプロンプトを定義
- 施設タイプ（`hospital` / `care_facility`）でプロンプトを切り替える
- `components/yomogi/` でストリーミングセリフのリアルタイム表示 UI を実装
- AI が生成したシフト案を `shifts` テーブルに `status = draft` で保存する
- 不満スコア（0〜100）の算出と可視化（スタッフ別バー + ヨモギ主任コメント）

**プロンプト設計の原則**（`REQUIREMENTS.md 4.4.5` より）:

```
キャラクター: ヨモギ主任（安芸弁、辛辣だがスタッフを褒める）
施設タイプ:   hospital → ピリッとした口調 / care_facility → 人情味ある口調
出力順序:     ①状況確認ぼやき → ②進捗コメント → ③完成報告 → ④シフトJSON → ⑤不満スコアJSON
```

**安芸弁の注意点**:

- 「〜じゃけん」（語尾の「ん」をはっきり発音）— 備後弁の「〜けぇ」と混同しないこと
- 「ぶち〜」（とても）、「たいぎい」（しんどい）、「ほいじゃけん」（だから）を積極的に使う

**AI への入力データ型**（`REQUIREMENTS.md 4.4.2` より）:

```typescript
type AIShiftInput = {
  facilityType: "hospital" | "care_facility";
  targetMonth: string; // YYYY-MM
  staff: StaffProfile[];
  approvedLeaves: LeaveRequest[];
  constraints: ConstraintSetting[];
  shiftTypes: ShiftType[]; // time_zone 含む
  responsibleRoles: ResponsibleRole[];
  holidays: string[];
};
```

**完了条件**:

- ヨモギ主任のセリフがストリーミングでリアルタイム表示される
- 生成されたシフトが `shifts` テーブルに `draft` で正しく保存される
- 不満スコアがスタッフ別に表示され、高スコアは赤くハイライトされる
- 安芸弁のセリフが自然に出力されている

---

### 8. Excel 出力エージェント

**担当範囲**: シフト表の Excel（.xlsx）ファイル生成・ダウンロード

**参照先**: `REQUIREMENTS.md 8`（Excel 出力機能）

**責務**:

- `app/api/shifts/export/route.ts` で ExcelJS を使ったサーバーサイド生成を実装 ✅ 実装済み
- 2シート構成（月次シフト表 + スタッフ一覧）を作成する
- セル色・罫線・土日祝ハイライト・集計 COUNTA 数式を適用する
- `Content-Disposition` ヘッダーでファイル名を正しく設定する

**出力仕様**（`REQUIREMENTS.md 8.3` より）:

```
シート1: {YYYY年M月}シフト表
  横軸 = 日付（1〜末日 + 曜日）
  縦軸 = スタッフ名（役職順 → 五十音順）
  セル = 勤務区分略称 or 休暇区分略称
  色   = 各区分の設定色を背景に適用
  土曜 = 薄青 (D6E4F0) / 日祝 = 薄赤 (FAD7D7)
  フッター行 = 日中帯人数 / 夜間帯人数（COUNTA 数式。「明け」は夜間帯除外）

シート2: スタッフ一覧（勤務集計サマリー）
```

**実装上の注意点**:

- `ExcelJS.utils.encode_col` は存在しない。列インデックス（0始まり）→ 列名（A, B, ...）変換は自前の `colName(index)` 関数を実装する
- `leave_types` テーブルに `short_name` カラムはない。`key` フィールド（例: `paid_leave`）から略称を導出する
- 「明け」シフトの除外判定: `st.short_name.includes('明') || st.name.includes('明け')`

**禁止事項**:

- 集計値を Python や JavaScript で計算してセルに直接埋め込むこと（COUNTA 数式を使うこと）
- クライアントサイドで Excel ファイルを生成すること

**完了条件**:

- 管理者が「Excel 出力」ボタンを押すと .xlsx がダウンロードされる
- ファイル名が `YOMOGI_{YYYY}年{M}月シフト表_{YYYYMMDD}.xlsx` の形式になっている
- 土日祝のセルが正しく色分けされている
- フッター行に日中帯・夜間帯人数の COUNTA 数式が入っている

---

## タスク実行の共通ルール

### 着手前に必ず確認すること

1. `REQUIREMENTS.md` の該当セクションを読む
2. 関連するテーブル定義（`REQUIREMENTS.md 5.2`）を確認する
3. 既存の型定義（`types/database.ts`）と整合性を確認する

### 実装完了の基準

- TypeScript の型エラーがゼロ（`npx tsc --noEmit` がクリア）
- ESLint エラーがゼロ（`npm run lint` がクリア）
- `any` 型を使っていない
- 認証チェックが API Route に実装されている

### DB 変更時の手順

```
1. supabase/migrations/ に新しいファイルを作成
2. supabase db push でローカルに適用
3. supabase gen types typescript で型を再生成
4. types/database.ts をコミット
```

### 複数エージェントが連携するとき

依存関係がある場合は以下の順序を守る。

```
DBエージェント（スキーマ確定）
  ↓
認証・ルーティングエージェント（ログイン・ガード）
  ↓
マスタ設定エージェント（勤務区分・休暇区分・制約設定）
  ↓
スタッフ管理エージェント（スタッフ CRUD・休暇申請）
  ↓
シフト表 UI エージェント（カレンダー・D&D）
  ↓
承認フロー・通知エージェント（公開・メール）
  ↓
AI・ヨモギ主任エージェント（自動生成・不満スコア）
  ↓
Excel 出力エージェント（ダウンロード）
```

---

## 絶対禁止事項

| 禁止事項                                         | 理由                                                    |
| ------------------------------------------------ | ------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` をクライアントで使用 | 全施設データへの無制限アクセスが可能になる              |
| `any` 型の使用                                   | 型安全性が失われバグの温床になる                        |
| マイグレーションファイルの直接編集               | 適用済みファイルを変更すると環境によって差分が生じる    |
| 集計値をコードで計算してセルに埋め込む           | Excel ファイルが静的になり更新不可になる                |
| 勤務区分名で夜勤判定すること                     | 施設ごとに名称が異なるため `time_zone` カラムを使うこと |
| API Route での認証チェック省略                   | 他施設のデータへの不正アクセスを許すことになる          |
