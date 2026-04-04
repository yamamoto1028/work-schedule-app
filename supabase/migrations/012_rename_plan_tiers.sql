-- plan カラムの check 制約を 3 値（free / pro / enterprise）に更新
-- 既存の 'basic' データを 'free' に移行

-- 一時的に制約を外して値を更新してから再設定
alter table facilities drop constraint if exists facilities_plan_check;

update facilities set plan = 'free' where plan = 'basic';

alter table facilities
  add constraint facilities_plan_check
    check (plan in ('free', 'pro', 'enterprise'));
