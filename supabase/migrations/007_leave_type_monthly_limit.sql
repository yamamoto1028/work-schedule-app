-- leave_types に月あたり承認上限数カラムを追加
-- NULL = 上限なし
ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS monthly_limit integer DEFAULT NULL;
