-- 최종 안전한 사용자 Pro 플랜 업그레이드 SQL
-- created_at 컬럼 오류 수정 버전

-- ===========================================
-- 1단계: 현재 상태 확인 (실행 전 반드시 확인)
-- ===========================================
SELECT 
  'Current Status' as info,
  plan,
  plan_label,
  COUNT(*) as user_count,
  MIN(updated_at) as earliest_updated,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- 2단계: 업데이트 대상 사용자 확인
-- ===========================================
-- 실제로 업데이트될 사용자들을 미리 확인
SELECT 
  'Users to be updated to Pro' as info,
  au.email,
  up.plan as current_plan,
  up.plan_label as current_plan_label,
  up.user_id
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE (up.plan = 'free' OR up.plan IS NULL) 
  AND (up.plan_label = 'free' OR up.plan_label IS NULL);

-- ===========================================
-- 3단계: user_plan에 없는 사용자 확인
-- ===========================================
-- user_plan에 추가될 사용자들을 미리 확인
SELECT 
  'Users to be added to user_plan' as info,
  au.email,
  au.created_at as user_created_at
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- ===========================================
-- 4단계: Free 사용자만 Pro로 업그레이드
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

-- 업데이트 결과 확인
SELECT 
  'After Free to Pro update' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- 5단계: user_plan에 없는 사용자 추가
-- ===========================================
-- auth.users에는 있지만 user_plan에는 없는 사용자들만 Pro로 추가
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, updated_at)
SELECT 
  au.id,
  'pro',
  'pro',
  NOW() + INTERVAL '1 year',
  NOW()
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 추가 결과 확인
SELECT 
  'After adding missing users' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- 6단계: 최종 결과 확인
-- ===========================================
SELECT 
  'FINAL RESULT' as status,
  plan,
  plan_label,
  COUNT(*) as user_count,
  MIN(updated_at) as earliest_updated,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- 7단계: Pro 사용자 상세 정보
-- ===========================================
-- Pro로 업그레이드된 사용자들의 상세 정보
SELECT 
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = 'pro' AND up.plan_label = 'pro'
ORDER BY up.updated_at DESC
LIMIT 20;

-- ===========================================
-- 8단계: 최종 통계
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
  'RealE Users (unchanged)' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'RealE'
UNION ALL
SELECT 
  'Plus Users (unchanged)' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'Plus'
UNION ALL
SELECT 
  'Free/Null Users (remaining)' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'free' OR plan IS NULL OR plan_label = 'free' OR plan_label IS NULL;

-- ===========================================
-- 9단계: 롤백용 SQL (문제 발생시에만 사용)
-- ===========================================
-- 문제가 발생한 경우에만 아래 SQL 실행
-- UPDATE user_plan 
-- SET 
--   plan = 'free',
--   plan_label = 'free',
--   pro_until = NULL,
--   updated_at = NOW()
-- WHERE plan = 'pro' 
--   AND plan_label = 'pro'
--   AND updated_at >= NOW() - INTERVAL '1 hour';  -- 최근 1시간 내 업데이트만 롤백
