-- leave_types: 希望休フラグ
alter table leave_types
  add column if not exists is_wish boolean not null default false;

-- デモデータの desired_off を希望休としてフラグ
update leave_types set is_wish = true where key = 'desired_off';

-- facilities: 希望休申請の締め切り・最低提出数
alter table facilities
  add column if not exists leave_deadline_day  integer check (leave_deadline_day between 1 and 28),
  add column if not exists leave_min_wishes    integer not null default 2;
