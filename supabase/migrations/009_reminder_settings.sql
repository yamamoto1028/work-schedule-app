-- 確認督促通知の自動送信設定を facilities テーブルに追加
alter table facilities
  add column if not exists reminder_enabled  boolean not null default false,
  add column if not exists reminder_hour_jst integer not null default 10
    check (reminder_hour_jst >= 0 and reminder_hour_jst <= 23);
