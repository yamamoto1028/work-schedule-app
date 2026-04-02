-- スタッフごとに入れるシフト種別を制限するカラムを追加
-- 空配列 = 制限なし（すべて可）
ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS allowed_shift_type_ids text[] NOT NULL DEFAULT '{}';
