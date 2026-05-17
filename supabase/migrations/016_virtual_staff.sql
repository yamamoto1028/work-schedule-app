-- 仮想スタッフ対応: 管理者のみモードでアカウント不要のスタッフを管理できるようにする
alter table public.users
  add column if not exists is_virtual boolean not null default false;

comment on column public.users.is_virtual is '管理者が代理管理するスタッフ（ログイン不要）';
