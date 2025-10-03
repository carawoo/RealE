-- plan 컬럼이 문자열 타입인 경우의 업그레이드 SQL
-- plan이 'free', 'pro' 등의 문자열로 저장되어 있는 경우

-- 1. 현재 상태 확인
SELECT 
  'Before Update' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- 2. Free 사용자들을 Pro로 업그레이드
UPDATE user_plan 
SET 
  plan = 'pro',
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE plan = 'free' OR plan IS NULL OR plan_label = 'free';

-- 3. user_plan에 없는 사용자들 추가
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, created_at, updated_at)
SELECT 
  au.id,
  'pro',  -- 문자열인 경우
  'pro',
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  plan = 'pro',
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW();

-- 4. 결과 확인
SELECT 
  'After Update' as status,
  plan,
  plan_label,
  COUNT(*) as user_count,
  MIN(created_at) as earliest_created,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- 5. Pro 사용자 상세 정보
SELECT 
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.created_at,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = 'pro' AND up.plan_label = 'pro'
ORDER BY up.updated_at DESC
LIMIT 10;

-- 6. 최종 통계
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
WHERE plan = 'pro' AND plan_label = 'pro'
UNION ALL
SELECT 
  'Free Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'free' OR plan IS NULL OR plan_label = 'free';
