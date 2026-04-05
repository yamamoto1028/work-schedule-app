-- plan カラムのデフォルト値を 'basic' から 'free' に修正
-- (011 で 'basic' を設定し、012 で制約を変更したが DEFAULT の変更が漏れていた)
alter table facilities
  alter column plan set default 'free';
