-- 안전한 사용자 Pro 플랜 업그레이드 SQL
-- 기존 데이터에 영향을 주지 않도록 매우 조심스럽게 작성

-- ===========================================
-- 1단계: 현재 상태 확인 (실행 전 반드시 확인)
-- ===========================================
SELECT 
  'Current Status' as info,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- 2단계: Free 사용자만 선별적으로 업그레이드
-- ===========================================
-- plan이 'free'이거나 NULL인 사용자들만 Pro로 업그레이드
-- 기존 'Pro', 'RealE', 'Plus' 사용자는 건드리지 않음
UPDATE user_plan 
SET 
  plan = 'pro',
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE (plan = 'free' OR plan IS NULL) 
  AND (plan_label = 'free' OR plan_label IS NULL);

-- ===========================================
-- 3단계: user_plan에 없는 사용자들만 추가
-- ===========================================
-- auth.users에는 있지만 user_plan에는 없는 사용자들만 Pro로 추가
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, created_at, updated_at)
SELECT 
  au.id,
  'pro',
  'pro',
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL  -- user_plan에 없는 사용자만
ON CONFLICT (user_id) DO NOTHING;  -- 이미 있으면 아무것도 하지 않음

-- ===========================================
-- 4단계: 결과 확인
-- ===========================================
SELECT 
  'After Update' as info,
  plan,
  plan_label,
  COUNT(*) as user_count,
  MIN(created_at) as earliest_created,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- 5단계: 업데이트된 사용자들만 확인
-- ===========================================
-- 방금 업데이트된 사용자들만 보기
SELECT 
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = 'pro' 
  AND up.plan_label = 'pro'
  AND up.updated_at >= NOW() - INTERVAL '1 minute'  -- 방금 업데이트된 것만
ORDER BY up.updated_at DESC;

-- ===========================================
-- 6단계: 최종 통계
-- ===========================================
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
  'RealE Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'RealE'
UNION ALL
SELECT 
  'Plus Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'Plus'
UNION ALL
SELECT 
  'Free/Null Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'free' OR plan IS NULL OR plan_label = 'free' OR plan_label IS NULL;

-- ===========================================
-- 7단계: 롤백용 SQL (필요시 사용)
-- ===========================================
-- 만약 문제가 생기면 아래 SQL로 롤백 가능
-- UPDATE user_plan 
-- SET 
--   plan = 'free',
--   plan_label = 'free',
--   pro_until = NULL,
--   updated_at = NOW()
-- WHERE plan = 'pro' 
--   AND plan_label = 'pro'
--   AND updated_at >= NOW() - INTERVAL '1 hour';  -- 최근 1시간 내 업데이트만 롤백
