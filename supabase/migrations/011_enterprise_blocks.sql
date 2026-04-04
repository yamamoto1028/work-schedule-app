-- ============================================================
-- Enterprise プラン: フロア / ブロック構造
-- ============================================================

-- 施設プランティア
alter table facilities
  add column if not exists plan text not null default 'basic'
    check (plan in ('basic', 'enterprise'));

-- フロア（施設内の階層グループ）
create table if not exists floors (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references facilities(id) on delete cascade,
  name         text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table floors enable row level security;
create policy "facility members can manage floors"
  on floors for all
  using (
    facility_id in (select facility_id from users where id = auth.uid())
  );

-- ブロック / ユニット（シフト管理の単位）
create table if not exists blocks (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references facilities(id) on delete cascade,
  floor_id     uuid references floors(id) on delete set null,
  name         text not null,
  color        text not null default '#059669',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table blocks enable row level security;
create policy "facility members can manage blocks"
  on blocks for all
  using (
    facility_id in (select facility_id from users where id = auth.uid())
  );

-- スタッフ → ブロック割り当て（nullable: 未割り当て可）
alter table staff_profiles
  add column if not exists block_id uuid references blocks(id) on delete set null;

-- シフト → ブロックスコープ（nullable: Basic プラン互換）
alter table shifts
  add column if not exists block_id uuid references blocks(id) on delete cascade;

-- フロアレベルの責任者制約に備え responsible_roles に floor_id を追加（Phase 2 用）
alter table responsible_roles
  add column if not exists floor_id uuid references floors(id) on delete set null;
