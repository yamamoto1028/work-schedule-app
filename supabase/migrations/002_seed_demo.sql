-- =============================================
-- デモ用シードデータ
-- ※ 実行前に Supabase Auth で管理者ユーザーを作成し、
--   そのUUIDを admin_user_id に置き換えてください
-- =============================================

-- デモ施設の作成（介護施設）
insert into facilities (id, name, type) values
  ('11111111-1111-1111-1111-111111111111', 'さくら介護センター', 'care_facility')
on conflict do nothing;

-- 責任者区分（介護施設デフォルト）
insert into responsible_roles (facility_id, name, color, require_day_zone, require_day_zone_count, require_night_zone, require_night_zone_count) values
  ('11111111-1111-1111-1111-111111111111', 'ユニットリーダー', '#E25822', true, 1, false, 1)
on conflict do nothing;

-- 勤務区分マスタ（介護施設デフォルト）
insert into shift_types (facility_id, name, short_name, color, start_time, end_time, time_zone, sort_order) values
  ('11111111-1111-1111-1111-111111111111', '早番', '早', '#4DB6AC', '07:00', '16:00', 'day', 1),
  ('11111111-1111-1111-1111-111111111111', '日勤', '日', '#4472C4', '09:00', '18:00', 'day', 2),
  ('11111111-1111-1111-1111-111111111111', '遅番', '遅', '#7E57C2', '11:00', '20:00', 'day', 3),
  ('11111111-1111-1111-1111-111111111111', '夜勤', '夜', '#1565C0', '16:45', '09:15', 'night', 4),
  ('11111111-1111-1111-1111-111111111111', '明け', '明', '#90A4AE', '09:15', '10:00', 'night', 5)
on conflict do nothing;

-- 休暇区分マスタ（デフォルト）
insert into leave_types (facility_id, key, name, color, is_default, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'desired_off', '希望休', '#888888', true, 1),
  ('11111111-1111-1111-1111-111111111111', 'paid_holiday', '有給休暇', '#4CAF50', true, 2),
  ('11111111-1111-1111-1111-111111111111', 'maternity_leave', '産前産後休暇', '#E91E63', true, 3),
  ('11111111-1111-1111-1111-111111111111', 'childcare_leave', '育児休業', '#FF9800', true, 4)
on conflict do nothing;

-- 制約設定（デフォルト値）
insert into constraint_settings (facility_id, constraint_key, is_enabled, value) values
  ('11111111-1111-1111-1111-111111111111', 'rest_after_night_off', true, '{}'),
  ('11111111-1111-1111-1111-111111111111', 'no_day_shift_after_night', true, '{}'),
  ('11111111-1111-1111-1111-111111111111', 'max_consecutive_day_only', true, '{"days": 3}'),
  ('11111111-1111-1111-1111-111111111111', 'max_consecutive_with_night', true, '{"days": 4}'),
  ('11111111-1111-1111-1111-111111111111', 'max_consecutive_days', true, '{"days": 5}'),
  ('11111111-1111-1111-1111-111111111111', 'min_days_off_per_month', true, '{"days": 8}'),
  ('11111111-1111-1111-1111-111111111111', 'min_weekly_days_off', true, '{"days": 2}'),
  ('11111111-1111-1111-1111-111111111111', 'max_monthly_shifts', true, '{"shifts": 22}'),
  ('11111111-1111-1111-1111-111111111111', 'night_shift_equal_distribution', true, '{}'),
  ('11111111-1111-1111-1111-111111111111', 'max_night_shifts_per_month', true, '{"count": 8}'),
  ('11111111-1111-1111-1111-111111111111', 'require_skill_match', true, '{}'),
  ('11111111-1111-1111-1111-111111111111', 'half_staff_isolation', true, '{}')
on conflict (facility_id, constraint_key) do nothing;
