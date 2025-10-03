-- 조건부 사용자 Pro 플랜 업그레이드 SQL
-- 특정 조건에 맞는 사용자들만 Pro로 업그레이드

-- ===========================================
-- 조건 1: 특정 기간 이후 가입한 사용자들만 Pro로 업그레이드
-- ===========================================
-- 예: 2024년 1월 1일 이후 가입한 사용자들만 Pro로 업그레이드
UPDATE user_plan 
SET 
  plan = TRUE,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE created_at >= '2024-01-01'::timestamp
)
AND (plan = FALSE OR plan_label = 'free');

-- ===========================================
-- 조건 2: 특정 이메일 도메인 사용자들만 Pro로 업그레이드
-- ===========================================
-- 예: @company.com 도메인 사용자들만 Pro로 업그레이드
UPDATE user_plan 
SET 
  plan = TRUE,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@company.com'
)
AND (plan = FALSE OR plan_label = 'free');

-- ===========================================
-- 조건 3: 특정 사용자 ID 목록으로 업그레이드
-- ===========================================
-- 예: 특정 사용자 ID들을 Pro로 업그레이드
-- UPDATE user_plan 
-- SET 
--   plan = TRUE,
--   plan_label = 'pro',
--   pro_until = NOW() + INTERVAL '1 year',
--   updated_at = NOW()
-- WHERE user_id IN (
--   'user-id-1',
--   'user-id-2',
--   'user-id-3'
-- )
-- AND (plan = FALSE OR plan_label = 'free');

-- ===========================================
-- 조건 4: 특정 이메일 목록으로 업그레이드
-- ===========================================
-- 예: 특정 이메일들을 Pro로 업그레이드
-- UPDATE user_plan 
-- SET 
--   plan = TRUE,
--   plan_label = 'pro',
--   pro_until = NOW() + INTERVAL '1 year',
--   updated_at = NOW()
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email IN (
--     'user1@example.com',
--     'user2@example.com',
--     'user3@example.com'
--   )
-- )
-- AND (plan = FALSE OR plan_label = 'free');

-- ===========================================
-- 조건 5: 활성 사용자만 Pro로 업그레이드 (최근 로그인 기준)
-- ===========================================
-- 예: 최근 30일 내에 로그인한 사용자들만 Pro로 업그레이드
-- UPDATE user_plan 
-- SET 
--   plan = TRUE,
--   plan_label = 'pro',
--   pro_until = NOW() + INTERVAL '1 year',
--   updated_at = NOW()
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE last_sign_in_at >= NOW() - INTERVAL '30 days'
-- )
-- AND (plan = FALSE OR plan_label = 'free');

-- ===========================================
-- 조건 6: 배치 크기 제한으로 업그레이드 (대용량 데이터용)
-- ===========================================
-- 예: 한 번에 100명씩만 업그레이드
-- WITH users_to_update AS (
--   SELECT user_id 
--   FROM user_plan 
--   WHERE (plan = FALSE OR plan_label = 'free')
--   LIMIT 100
-- )
-- UPDATE user_plan 
-- SET 
--   plan = TRUE,
--   plan_label = 'pro',
--   pro_until = NOW() + INTERVAL '1 year',
--   updated_at = NOW()
-- WHERE user_id IN (SELECT user_id FROM users_to_update);

-- ===========================================
-- 결과 확인 쿼리
-- ===========================================
-- 업데이트 후 상태 확인
SELECT 
  'Updated Users' as status,
  plan_label,
  COUNT(*) as user_count,
  MIN(created_at) as earliest_created,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan_label
ORDER BY plan_label;

-- 업데이트된 사용자들의 상세 정보
SELECT 
  au.email,
  au.created_at as user_created_at,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at as plan_updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = TRUE AND up.plan_label = 'pro'
ORDER BY up.updated_at DESC
LIMIT 20;
