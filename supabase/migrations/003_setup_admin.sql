-- =============================================
-- Step 1: トリガーをメタデータなしでも動くよう修正
-- =============================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- facility_id が metadata に含まれる場合のみ insert
  -- (Supabase Auth Dashboard から直接作成した場合はスキップ)
  if (new.raw_user_meta_data->>'facility_id') is not null then
    insert into public.users (id, facility_id, email, display_name, role)
    values (
      new.id,
      (new.raw_user_meta_data->>'facility_id')::uuid,
      new.email,
      coalesce(new.raw_user_meta_data->>'display_name', new.email),
      coalesce(new.raw_user_meta_data->>'role', 'staff')
    );
  end if;
  return new;
end;
$$;

-- =============================================
-- Step 2: 管理者ユーザーを手動で public.users に登録
-- ※ Supabase Auth Dashboard でユーザー作成後、
--   作成されたユーザーのUUID を YOUR_AUTH_USER_UUID に入れて実行
-- =============================================

-- 下記の値を変更してから実行してください
-- YOUR_AUTH_USER_UUID : Supabase Auth > Users で確認できるUUID
-- your-admin@example.com : 登録したメールアドレス
-- 管理者の表示名 : 好きな名前

insert into public.users (id, facility_id, email, display_name, role)
values (
  '0c06bd84-551e-4ae3-9103-e75934059107',                           -- ← 変更必須
  '11111111-1111-1111-1111-111111111111',          -- seed_demoで作成した施設UUID
  'shuhei.yamamoto.h10@gmail.com',                        -- ← 変更必須
  'Yamamoto Shuhei',                                 -- ← 変更必須
  'admin'
)
on conflict (id) do update
  set facility_id = excluded.facility_id,
      display_name = excluded.display_name,
      role = excluded.role;
