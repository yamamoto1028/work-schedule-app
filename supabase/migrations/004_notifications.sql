-- 通知テーブル
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null, -- 'shift_published' | 'leave_approved' | 'leave_rejected' | 'leave_requested'
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_facility_id on notifications(facility_id);

alter table notifications enable row level security;

-- 本人の通知のみ閲覧・更新可能
create policy "own_notifications_select" on notifications
  for select using (auth.uid() = user_id);

create policy "own_notifications_update" on notifications
  for update using (auth.uid() = user_id);

-- サービスロールのみ挿入可（API Route 経由）
create policy "service_insert_notifications" on notifications
  for insert with check (true);

-- Realtime を有効化
alter publication supabase_realtime add table notifications;
