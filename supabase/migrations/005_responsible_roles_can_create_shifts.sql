-- responsible_roles に can_create_shifts カラムを追加
-- このカラムが true の責任者区分に属するスタッフはシフト作成権限を持つ
ALTER TABLE responsible_roles
  ADD COLUMN IF NOT EXISTS can_create_shifts boolean NOT NULL DEFAULT false;
