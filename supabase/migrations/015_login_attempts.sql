-- ログイン試行回数を追跡し、10回以上の失敗でアカウントをロックする
-- Stripe PCI DSS 要件対応

create table if not exists public.login_attempts (
  email          text primary key,
  failed_count   integer      not null default 0,
  locked_until   timestamptz,
  last_failed_at timestamptz
);

-- RLS を有効化（service role のみアクセス可。一般ユーザーからは不可視）
alter table public.login_attempts enable row level security;
-- ポリシーなし = anon/authenticated ロールからは一切アクセス不可
