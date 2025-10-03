-- 모든 사용자를 Pro 플랜으로 업그레이드하는 SQL (수정된 버전)
-- plan 컬럼이 boolean이 아닐 경우를 대비한 안전한 버전

-- 1. 현재 상태 확인
SELECT 
  'Before Update' as status,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan_label
ORDER BY plan_label;

-- 2. plan 컬럼 타입 확인
SELECT 
  plan,
  pg_typeof(plan) as plan_type,
  plan_label,
  pg_typeof(plan_label) as plan_label_type
FROM user_plan 
LIMIT 3;

-- 3. plan_label 기준으로 업데이트 (더 안전한 방법)
UPDATE user_plan 
SET 
  plan = TRUE,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE plan_label = 'free' OR plan_label IS NULL;

-- 4. plan이 boolean이 아닌 경우를 위한 대안
-- 만약 plan이 문자열이라면:
-- UPDATE user_plan 
-- SET 
--   plan = 'pro',
--   plan_label = 'pro',
--   pro_until = NOW() + INTERVAL '1 year',
--   updated_at = NOW()
-- WHERE plan = 'free' OR plan IS NULL OR plan_label = 'free';

-- 5. user_plan에 없는 사용자들 추가
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, created_at, updated_at)
SELECT 
  au.id,
  TRUE,  -- boolean인 경우
  'pro',
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  plan = TRUE,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW();

-- 6. 결과 확인
SELECT 
  'After Update' as status,
  plan_label,
  COUNT(*) as user_count,
  MIN(created_at) as earliest_created,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan_label
ORDER BY plan_label;

-- 7. Pro 사용자 상세 정보
SELECT 
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.created_at,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan_label = 'pro'
ORDER BY up.updated_at DESC
LIMIT 10;

-- 8. 최종 통계
SELECT 
  'Total Users in auth.users' as metric,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Total Users in user_plan' as metric,
  COUNT(*) as count
FROM user_plan
UNION ALL
SELECT 
  'Pro Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan_label = 'pro'
UNION ALL
SELECT 
  'Free Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan_label = 'free' OR plan_label IS NULL;
