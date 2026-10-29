-- 土日祝休み固定のスタッフ（平日日勤のみのパート等）
-- true のスタッフは土日祝にシフトを入れず、連勤上限・公休数のチェック対象外とする
alter table public.staff_profiles
  add column if not exists weekends_holidays_off boolean not null default false;

comment on column public.staff_profiles.weekends_holidays_off is '土日祝休み固定（連勤上限・公休数の対象外）';
