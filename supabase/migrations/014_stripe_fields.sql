-- Stripe 決済連携用フィールドを facilities テーブルに追加
alter table facilities
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

-- 検索用インデックス（Webhook での特定を高速化）
create unique index if not exists idx_facilities_stripe_customer_id
  on facilities(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists idx_facilities_stripe_subscription_id
  on facilities(stripe_subscription_id)
  where stripe_subscription_id is not null;
