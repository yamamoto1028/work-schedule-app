-- =============================================
-- YOMOGI 初期スキーマ
-- =============================================

-- 施設テーブル
create table if not exists facilities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in ('hospital', 'care_facility')),
  logo_url   text,
  created_at timestamptz not null default now()
);

-- ユーザーテーブル
create table if not exists users (
  id           uuid primary key references auth.users(id) on delete cascade,
  facility_id  uuid not null references facilities(id) on delete cascade,
  email        text not null unique,
  display_name text not null,
  role         text not null check (role in ('admin', 'staff')),
  avatar_url   text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 責任者区分マスタ
create table if not exists responsible_roles (
  id                       uuid primary key default gen_random_uuid(),
  facility_id              uuid not null references facilities(id) on delete cascade,
  name                     text not null,
  color                    text not null default '#E25822',
  require_day_zone         boolean not null default true,
  require_day_zone_count   integer not null default 1,
  require_night_zone       boolean not null default false,
  require_night_zone_count integer not null default 1,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now()
);

-- スタッフプロフィール
create table if not exists staff_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  facility_id         uuid not null references facilities(id) on delete cascade,
  employment_type     text,
  position            text,
  responsible_role_id uuid references responsible_roles(id) on delete set null,
  skills              text[] default '{}',
  can_night_shift     boolean not null default true,
  max_monthly_shifts  integer,
  phone               text,
  staff_grade         text not null default 'full' check (staff_grade in ('full', 'half', 'new')),
  fixed_night_count   integer,
  updated_at          timestamptz not null default now(),
  unique (user_id)
);

-- 勤務区分マスタ
create table if not exists shift_types (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  name            text not null,
  short_name      text not null,
  color           text not null default '#4472C4',
  start_time      time,
  end_time        time,
  time_zone       text not null check (time_zone in ('day', 'night')),
  required_skills text[] default '{}',
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

-- 休暇区分マスタ
create table if not exists leave_types (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references facilities(id) on delete cascade,
  key          text not null,
  name         text not null,
  color        text not null default '#888888',
  is_default   boolean not null default false,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (facility_id, key)
);

-- シフトテーブル
create table if not exists shifts (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid not null references facilities(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  shift_type_id  uuid not null references shift_types(id) on delete restrict,
  date           date not null,
  status         text not null default 'draft' check (status in ('draft', 'published', 'confirmed')),
  note           text,
  created_by     uuid references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (facility_id, user_id, date)
);

-- 休暇申請テーブル
create table if not exists leave_requests (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid not null references facilities(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  leave_type_id  uuid not null references leave_types(id) on delete restrict,
  date           date not null,
  reason         text,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by    uuid references users(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- 制約設定テーブル
create table if not exists constraint_settings (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  constraint_key  text not null,
  is_enabled      boolean not null default true,
  value           jsonb not null default '{}',
  updated_at      timestamptz not null default now(),
  unique (facility_id, constraint_key)
);

-- 委員会担当テーブル
create table if not exists committee_assignments (
  id              uuid primary key default gen_random_uuid(),
  facility_id     uuid not null references facilities(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  committee_name  text not null,
  meeting_dates   date[] not null default '{}',
  created_at      timestamptz not null default now()
);

-- 施設行事テーブル
create table if not exists facility_events (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references facilities(id) on delete cascade,
  event_type    text not null check (event_type in ('bathing', 'linen', 'custom')),
  event_name    text not null,
  date          date not null,
  extra_staff   jsonb default '{}',
  note          text,
  created_at    timestamptz not null default now()
);

-- =============================================
-- インデックス
-- =============================================
create index if not exists idx_users_facility_id on users(facility_id);
create index if not exists idx_staff_profiles_facility_id on staff_profiles(facility_id);
create index if not exists idx_shift_types_facility_id on shift_types(facility_id);
create index if not exists idx_leave_types_facility_id on leave_types(facility_id);
create index if not exists idx_shifts_facility_id on shifts(facility_id);
create index if not exists idx_shifts_user_id on shifts(user_id);
create index if not exists idx_shifts_date on shifts(date);
create index if not exists idx_leave_requests_facility_id on leave_requests(facility_id);
create index if not exists idx_leave_requests_user_id on leave_requests(user_id);

-- =============================================
-- RLS（Row Level Security）
-- =============================================

alter table facilities enable row level security;
alter table users enable row level security;
alter table staff_profiles enable row level security;
alter table shift_types enable row level security;
alter table leave_types enable row level security;
alter table responsible_roles enable row level security;
alter table shifts enable row level security;
alter table leave_requests enable row level security;
alter table constraint_settings enable row level security;
alter table committee_assignments enable row level security;
alter table facility_events enable row level security;

-- facilities: 自施設のみ参照可
create policy "facilities_select" on facilities
  for select using (
    id in (select facility_id from users where id = auth.uid())
  );

-- users: 同一施設のみ参照可
create policy "users_select" on users
  for select using (
    facility_id in (select facility_id from users where id = auth.uid())
  );

create policy "users_update_self" on users
  for update using (id = auth.uid());

create policy "users_insert_admin" on users
  for insert with check (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- staff_profiles: 管理者は全件 / スタッフは自分のみ
create policy "staff_profiles_select_admin" on staff_profiles
  for select using (
    facility_id in (
      select facility_id from users where id = auth.uid()
    )
  );

create policy "staff_profiles_insert_admin" on staff_profiles
  for insert with check (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "staff_profiles_update_admin" on staff_profiles
  for update using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
    or user_id = auth.uid()
  );

create policy "staff_profiles_delete_admin" on staff_profiles
  for delete using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- shift_types: 管理者は全件 / スタッフは参照のみ
create policy "shift_types_select" on shift_types
  for select using (
    facility_id in (select facility_id from users where id = auth.uid())
  );

create policy "shift_types_insert_admin" on shift_types
  for insert with check (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "shift_types_update_admin" on shift_types
  for update using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "shift_types_delete_admin" on shift_types
  for delete using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- leave_types: 管理者は全件 / スタッフは参照のみ
create policy "leave_types_select" on leave_types
  for select using (
    facility_id in (select facility_id from users where id = auth.uid())
  );

create policy "leave_types_insert_admin" on leave_types
  for insert with check (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "leave_types_update_admin" on leave_types
  for update using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "leave_types_delete_admin" on leave_types
  for delete using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- responsible_roles: 管理者は全件 / スタッフは参照のみ
create policy "responsible_roles_select" on responsible_roles
  for select using (
    facility_id in (select facility_id from users where id = auth.uid())
  );

create policy "responsible_roles_insert_admin" on responsible_roles
  for insert with check (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "responsible_roles_update_admin" on responsible_roles
  for update using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "responsible_roles_delete_admin" on responsible_roles
  for delete using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- shifts: 管理者は全件 / スタッフは自分の published 以降のみ参照
create policy "shifts_select_admin" on shifts
  for select using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "shifts_select_staff" on shifts
  for select using (
    user_id = auth.uid() and status in ('published', 'confirmed')
  );

create policy "shifts_insert_admin" on shifts
  for insert with check (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "shifts_update_admin" on shifts
  for update using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "shifts_update_staff_confirm" on shifts
  for update using (
    user_id = auth.uid() and status = 'published'
  )
  with check (status = 'confirmed');

create policy "shifts_delete_admin" on shifts
  for delete using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- leave_requests: 管理者は全件 / スタッフは自分のみ
create policy "leave_requests_select_admin" on leave_requests
  for select using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "leave_requests_select_staff" on leave_requests
  for select using (user_id = auth.uid());

create policy "leave_requests_insert_staff" on leave_requests
  for insert with check (user_id = auth.uid());

create policy "leave_requests_update_admin" on leave_requests
  for update using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "leave_requests_update_staff_pending" on leave_requests
  for update using (
    user_id = auth.uid() and status = 'pending'
  );

create policy "leave_requests_delete_staff_pending" on leave_requests
  for delete using (
    user_id = auth.uid() and status = 'pending'
  );

-- constraint_settings: 管理者のみ
create policy "constraint_settings_admin" on constraint_settings
  for all using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- committee_assignments: 管理者は全件 / スタッフは参照のみ
create policy "committee_assignments_select" on committee_assignments
  for select using (
    facility_id in (select facility_id from users where id = auth.uid())
  );

create policy "committee_assignments_admin" on committee_assignments
  for all using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- facility_events: 管理者は全件 / スタッフは参照のみ
create policy "facility_events_select" on facility_events
  for select using (
    facility_id in (select facility_id from users where id = auth.uid())
  );

create policy "facility_events_admin" on facility_events
  for all using (
    facility_id in (
      select facility_id from users where id = auth.uid() and role = 'admin'
    )
  );

-- =============================================
-- 新規ユーザー登録トリガー（Auth → usersテーブル）
-- =============================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- メタデータから facility_id, display_name, role を取得して insert
  insert into public.users (id, facility_id, email, display_name, role)
  values (
    new.id,
    (new.raw_user_meta_data->>'facility_id')::uuid,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
