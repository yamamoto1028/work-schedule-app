-- =============================================
-- デモ用スタッフ・シフトデータ (2026年4月)
--
-- 実行方法:
--   Supabase SQL Editor でこのファイルを全選択して実行してください。
--   ※ auth.users の外部キー制約を一時的に無効化してから挿入します。
--
-- デモ施設: さくら介護センター (11111111-1111-1111-1111-111111111111)
-- スタッフ: 10名（常勤7名・非常勤2名・新人1名）
-- シフト: 2026年4月 全日程（公開済み）
-- =============================================

DO $$
DECLARE
  fid  uuid := '11111111-1111-1111-1111-111111111111';
  -- スタッフUUID
  s1   uuid := 'cc000000-0000-0000-0000-000000000001';
  s2   uuid := 'cc000000-0000-0000-0000-000000000002';
  s3   uuid := 'cc000000-0000-0000-0000-000000000003';
  s4   uuid := 'cc000000-0000-0000-0000-000000000004';
  s5   uuid := 'cc000000-0000-0000-0000-000000000005';
  s6   uuid := 'cc000000-0000-0000-0000-000000000006';
  s7   uuid := 'cc000000-0000-0000-0000-000000000007';
  s8   uuid := 'cc000000-0000-0000-0000-000000000008';
  s9   uuid := 'cc000000-0000-0000-0000-000000000009';
  s10  uuid := 'cc000000-0000-0000-0000-000000000010';
  -- シフト区分ID
  st_haya  uuid;
  st_nichi uuid;
  st_oso   uuid;
  st_yakan uuid;
  st_ake   uuid;
  -- 休暇区分ID
  lt_kibou uuid;
  lt_paid  uuid;
  -- 責任者区分ID
  rr_ul    uuid;
BEGIN

  -- ----------------------------------------
  -- シフト区分・休暇区分・責任者区分のID取得
  -- ----------------------------------------
  SELECT id INTO st_haya  FROM shift_types WHERE facility_id = fid AND short_name = '早';
  SELECT id INTO st_nichi FROM shift_types WHERE facility_id = fid AND short_name = '日';
  SELECT id INTO st_oso   FROM shift_types WHERE facility_id = fid AND short_name = '遅';
  SELECT id INTO st_yakan FROM shift_types WHERE facility_id = fid AND short_name = '夜';
  SELECT id INTO st_ake   FROM shift_types WHERE facility_id = fid AND short_name = '明';
  SELECT id INTO lt_kibou FROM leave_types  WHERE facility_id = fid AND key = 'desired_off';
  SELECT id INTO lt_paid  FROM leave_types  WHERE facility_id = fid AND key = 'paid_holiday';
  SELECT id INTO rr_ul    FROM responsible_roles WHERE facility_id = fid AND name = 'ユニットリーダー';

  -- ----------------------------------------
  -- auth.users への仮挿入（外部キー制約回避）
  -- ※ メール確認なし・パスワードなしの仮アカウント
  -- ----------------------------------------
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  SELECT uid, mail, '', now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated'
  FROM (VALUES
    (s1,  'tanaka.misaki@sakura.demo'),
    (s2,  'yamada.hanako@sakura.demo'),
    (s3,  'sato.kenta@sakura.demo'),
    (s4,  'suzuki.aiko@sakura.demo'),
    (s5,  'takahashi.makoto@sakura.demo'),
    (s6,  'ito.sakura@sakura.demo'),
    (s7,  'watanabe.takuya@sakura.demo'),
    (s8,  'nakamura.yoko@sakura.demo'),
    (s9,  'kobayashi.ren@sakura.demo'),
    (s10, 'kato.nana@sakura.demo')
  ) AS t(uid, mail)
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------
  -- public.users
  -- ----------------------------------------
  INSERT INTO users (id, facility_id, email, display_name, role, is_active)
  VALUES
    (s1,  fid, 'tanaka.misaki@sakura.demo',      '田中 美咲', 'staff', true),
    (s2,  fid, 'yamada.hanako@sakura.demo',       '山田 花子', 'staff', true),
    (s3,  fid, 'sato.kenta@sakura.demo',          '佐藤 健太', 'staff', true),
    (s4,  fid, 'suzuki.aiko@sakura.demo',         '鈴木 愛子', 'staff', true),
    (s5,  fid, 'takahashi.makoto@sakura.demo',    '高橋 誠',   'staff', true),
    (s6,  fid, 'ito.sakura@sakura.demo',          '伊藤 さくら','staff',true),
    (s7,  fid, 'watanabe.takuya@sakura.demo',     '渡辺 拓也', 'staff', true),
    (s8,  fid, 'nakamura.yoko@sakura.demo',       '中村 陽子', 'staff', true),
    (s9,  fid, 'kobayashi.ren@sakura.demo',       '小林 蓮',   'staff', true),
    (s10, fid, 'kato.nana@sakura.demo',           '加藤 奈々', 'staff', true)
  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------
  -- staff_profiles
  -- ----------------------------------------
  INSERT INTO staff_profiles
    (user_id, facility_id, employment_type, position, responsible_role_id, staff_grade, can_night_shift, phone)
  VALUES
    (s1,  fid, '常勤', '介護福祉士', rr_ul, 'full', true,  '090-1111-0001'),
    (s2,  fid, '常勤', '介護職員',   null,  'full', true,  '090-1111-0002'),
    (s3,  fid, '常勤', '介護職員',   null,  'full', true,  '090-1111-0003'),
    (s4,  fid, '常勤', '介護福祉士', null,  'full', true,  '090-1111-0004'),
    (s5,  fid, '常勤', '介護職員',   null,  'full', true,  '090-1111-0005'),
    (s6,  fid, '常勤', '介護職員',   null,  'full', false, '090-1111-0006'),
    (s7,  fid, '常勤', '介護職員',   null,  'full', true,  '090-1111-0007'),
    (s8,  fid, '常勤', '介護職員',   null,  'new',  false, '090-1111-0008'),
    (s9,  fid, '非常勤','介護職員',  null,  'half', false, '090-1111-0009'),
    (s10, fid, '非常勤','介護職員',  null,  'half', false, '090-1111-0010')
  ON CONFLICT (user_id) DO NOTHING;

  -- ----------------------------------------
  -- 2026年4月 シフトデータ（公開済み）
  --
  -- 夜勤ルール: 夜勤(N日) → 明け(N+1日) → 休み(N+2日)
  -- 佐藤(s3): 夜勤 2,6,10,14,18,22,26 / 明け 3,7,11,15,19,23,27
  -- 高橋(s5): 夜勤 4,8,12,16,20,24,28 / 明け 5,9,13,17,21,25,29
  -- ----------------------------------------
  INSERT INTO shifts (facility_id, user_id, shift_type_id, date, status)
  SELECT fid, v.uid::uuid, v.stid, v.d::date, 'published'
  FROM (VALUES
    -- 田中 美咲 (UL・日勤メイン) 19日
    (s1, st_nichi, '2026-04-01'), (s1, st_nichi, '2026-04-02'),
    (s1, st_nichi, '2026-04-04'), (s1, st_nichi, '2026-04-06'),
    (s1, st_nichi, '2026-04-07'), (s1, st_nichi, '2026-04-09'),
    (s1, st_nichi, '2026-04-10'), (s1, st_nichi, '2026-04-11'),
    (s1, st_nichi, '2026-04-13'), (s1, st_nichi, '2026-04-14'),
    (s1, st_nichi, '2026-04-16'), (s1, st_nichi, '2026-04-17'),
    (s1, st_nichi, '2026-04-19'), (s1, st_nichi, '2026-04-21'),
    (s1, st_nichi, '2026-04-22'), (s1, st_nichi, '2026-04-24'),
    (s1, st_nichi, '2026-04-25'), (s1, st_nichi, '2026-04-28'),
    (s1, st_nichi, '2026-04-30'),
    -- 山田 花子 (早番・日勤) 20日
    (s2, st_haya,  '2026-04-01'), (s2, st_haya,  '2026-04-03'),
    (s2, st_haya,  '2026-04-05'), (s2, st_haya,  '2026-04-07'),
    (s2, st_haya,  '2026-04-09'), (s2, st_haya,  '2026-04-11'),
    (s2, st_haya,  '2026-04-13'), (s2, st_haya,  '2026-04-15'),
    (s2, st_haya,  '2026-04-17'), (s2, st_haya,  '2026-04-21'),
    (s2, st_haya,  '2026-04-23'), (s2, st_haya,  '2026-04-25'),
    (s2, st_haya,  '2026-04-27'), (s2, st_haya,  '2026-04-30'),
    (s2, st_nichi, '2026-04-06'), (s2, st_nichi, '2026-04-10'),
    (s2, st_nichi, '2026-04-14'), (s2, st_nichi, '2026-04-19'),
    (s2, st_nichi, '2026-04-24'), (s2, st_nichi, '2026-04-28'),
    -- 佐藤 健太 (夜勤7回・明け7回・日勤6回) 20日
    (s3, st_yakan, '2026-04-02'), (s3, st_yakan, '2026-04-06'),
    (s3, st_yakan, '2026-04-10'), (s3, st_yakan, '2026-04-14'),
    (s3, st_yakan, '2026-04-18'), (s3, st_yakan, '2026-04-22'),
    (s3, st_yakan, '2026-04-26'),
    (s3, st_ake,   '2026-04-03'), (s3, st_ake,   '2026-04-07'),
    (s3, st_ake,   '2026-04-11'), (s3, st_ake,   '2026-04-15'),
    (s3, st_ake,   '2026-04-19'), (s3, st_ake,   '2026-04-23'),
    (s3, st_ake,   '2026-04-27'),
    (s3, st_nichi, '2026-04-01'), (s3, st_nichi, '2026-04-05'),
    (s3, st_nichi, '2026-04-09'), (s3, st_nichi, '2026-04-13'),
    (s3, st_nichi, '2026-04-17'), (s3, st_nichi, '2026-04-21'),
    -- 鈴木 愛子 (遅番・日勤) 18日
    (s4, st_oso,   '2026-04-01'), (s4, st_oso,   '2026-04-03'),
    (s4, st_oso,   '2026-04-05'), (s4, st_oso,   '2026-04-07'),
    (s4, st_oso,   '2026-04-09'), (s4, st_oso,   '2026-04-11'),
    (s4, st_oso,   '2026-04-13'), (s4, st_oso,   '2026-04-15'),
    (s4, st_oso,   '2026-04-17'), (s4, st_oso,   '2026-04-21'),
    (s4, st_oso,   '2026-04-23'), (s4, st_oso,   '2026-04-25'),
    (s4, st_oso,   '2026-04-27'),
    (s4, st_nichi, '2026-04-06'), (s4, st_nichi, '2026-04-10'),
    (s4, st_nichi, '2026-04-14'), (s4, st_nichi, '2026-04-19'),
    (s4, st_nichi, '2026-04-24'),
    -- 高橋 誠 (夜勤7回・明け7回・日勤5回) 19日
    (s5, st_yakan, '2026-04-04'), (s5, st_yakan, '2026-04-08'),
    (s5, st_yakan, '2026-04-12'), (s5, st_yakan, '2026-04-16'),
    (s5, st_yakan, '2026-04-20'), (s5, st_yakan, '2026-04-24'),
    (s5, st_yakan, '2026-04-28'),
    (s5, st_ake,   '2026-04-05'), (s5, st_ake,   '2026-04-09'),
    (s5, st_ake,   '2026-04-13'), (s5, st_ake,   '2026-04-17'),
    (s5, st_ake,   '2026-04-21'), (s5, st_ake,   '2026-04-25'),
    (s5, st_ake,   '2026-04-29'),
    (s5, st_nichi, '2026-04-01'), (s5, st_nichi, '2026-04-02'),
    (s5, st_nichi, '2026-04-07'), (s5, st_nichi, '2026-04-11'),
    (s5, st_nichi, '2026-04-15'),
    -- 伊藤 さくら (早番・日勤・夜勤不可) 17日
    (s6, st_haya,  '2026-04-02'), (s6, st_haya,  '2026-04-04'),
    (s6, st_haya,  '2026-04-06'), (s6, st_haya,  '2026-04-08'),
    (s6, st_haya,  '2026-04-11'), (s6, st_haya,  '2026-04-14'),
    (s6, st_haya,  '2026-04-16'), (s6, st_haya,  '2026-04-18'),
    (s6, st_haya,  '2026-04-21'), (s6, st_haya,  '2026-04-24'),
    (s6, st_haya,  '2026-04-25'), (s6, st_haya,  '2026-04-28'),
    (s6, st_haya,  '2026-04-30'),
    (s6, st_nichi, '2026-04-07'), (s6, st_nichi, '2026-04-09'),
    (s6, st_nichi, '2026-04-12'), (s6, st_nichi, '2026-04-19'),
    -- 渡辺 拓也 (遅番・日勤) 15日
    (s7, st_oso,   '2026-04-02'), (s7, st_oso,   '2026-04-04'),
    (s7, st_oso,   '2026-04-07'), (s7, st_oso,   '2026-04-09'),
    (s7, st_oso,   '2026-04-12'), (s7, st_oso,   '2026-04-14'),
    (s7, st_oso,   '2026-04-16'), (s7, st_oso,   '2026-04-18'),
    (s7, st_oso,   '2026-04-21'), (s7, st_oso,   '2026-04-23'),
    (s7, st_oso,   '2026-04-25'), (s7, st_oso,   '2026-04-28'),
    (s7, st_nichi, '2026-04-06'), (s7, st_nichi, '2026-04-10'),
    (s7, st_nichi, '2026-04-20'),
    -- 中村 陽子 (新人・日勤のみ) 15日
    (s8, st_nichi, '2026-04-01'), (s8, st_nichi, '2026-04-02'),
    (s8, st_nichi, '2026-04-03'), (s8, st_nichi, '2026-04-05'),
    (s8, st_nichi, '2026-04-06'), (s8, st_nichi, '2026-04-08'),
    (s8, st_nichi, '2026-04-09'), (s8, st_nichi, '2026-04-11'),
    (s8, st_nichi, '2026-04-12'), (s8, st_nichi, '2026-04-14'),
    (s8, st_nichi, '2026-04-15'), (s8, st_nichi, '2026-04-17'),
    (s8, st_nichi, '2026-04-18'), (s8, st_nichi, '2026-04-20'),
    (s8, st_nichi, '2026-04-21'),
    -- 小林 蓮 (半人前・日勤のみ・非常勤) 13日
    (s9, st_nichi, '2026-04-04'), (s9, st_nichi, '2026-04-05'),
    (s9, st_nichi, '2026-04-07'), (s9, st_nichi, '2026-04-08'),
    (s9, st_nichi, '2026-04-10'), (s9, st_nichi, '2026-04-11'),
    (s9, st_nichi, '2026-04-14'), (s9, st_nichi, '2026-04-17'),
    (s9, st_nichi, '2026-04-19'), (s9, st_nichi, '2026-04-21'),
    (s9, st_nichi, '2026-04-22'), (s9, st_nichi, '2026-04-25'),
    (s9, st_nichi, '2026-04-28'),
    -- 加藤 奈々 (半人前・遅番のみ・非常勤) 12日
    (s10, st_oso,  '2026-04-06'), (s10, st_oso,  '2026-04-07'),
    (s10, st_oso,  '2026-04-09'), (s10, st_oso,  '2026-04-10'),
    (s10, st_oso,  '2026-04-12'), (s10, st_oso,  '2026-04-13'),
    (s10, st_oso,  '2026-04-19'), (s10, st_oso,  '2026-04-20'),
    (s10, st_oso,  '2026-04-22'), (s10, st_oso,  '2026-04-23'),
    (s10, st_oso,  '2026-04-26'), (s10, st_oso,  '2026-04-27')
  ) AS v(uid, stid, d)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------
  -- 休暇申請データ
  -- ----------------------------------------
  -- 承認済み: 山田 花子 有給 4/20
  INSERT INTO leave_requests (facility_id, user_id, leave_type_id, date, status)
  VALUES (fid, s2, lt_paid, '2026-04-20', 'approved')
  ON CONFLICT DO NOTHING;

  -- 承認済み: 中村 陽子 希望休 4/22（新人なので早めに申請）
  INSERT INTO leave_requests (facility_id, user_id, leave_type_id, date, status)
  VALUES (fid, s8, lt_kibou, '2026-04-22', 'approved')
  ON CONFLICT DO NOTHING;

  -- 承認待ち: 佐藤 健太 希望休 4/29（昭和の日に申請）
  INSERT INTO leave_requests (facility_id, user_id, leave_type_id, date, reason, status)
  VALUES (fid, s3, lt_kibou, '2026-04-29', '家族の行事があります', 'pending')
  ON CONFLICT DO NOTHING;

  -- 承認待ち: 高橋 誠 有給 4/30
  INSERT INTO leave_requests (facility_id, user_id, leave_type_id, date, reason, status)
  VALUES (fid, s5, lt_paid, '2026-04-30', '旅行のため', 'pending')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'デモデータの投入が完了しました。スタッフ10名・シフト約150件・休暇申請4件';
END $$;
