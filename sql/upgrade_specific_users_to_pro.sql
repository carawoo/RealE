-- 특정 사용자들을 Pro 플랜으로 업그레이드하는 SQL
-- bflymam@naver.com과 wkj719@naver.com 사용자 대상

-- ===========================================
-- 1단계: 대상 사용자 현재 상태 확인
-- ===========================================
SELECT 
  'Target Users Current Status' as info,
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('bflymam@naver.com', 'wkj719@naver.com')
ORDER BY au.email;

-- ===========================================
-- 2단계: 대상 사용자 Pro로 업그레이드
-- ===========================================
-- 특정 이메일의 사용자들만 Pro로 업그레이드
UPDATE user_plan 
SET 
  plan = 'pro'::plan_type,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('bflymam@naver.com', 'wkj719@naver.com')
);

-- ===========================================
-- 3단계: 업그레이드 결과 확인
-- ===========================================
SELECT 
  'After Upgrade - Target Users' as info,
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('bflymam@naver.com', 'wkj719@naver.com')
ORDER BY au.email;

-- ===========================================
-- 4단계: 전체 상태 확인
-- ===========================================
SELECT 
  'Overall Status After Upgrade' as info,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- 5단계: Pro 사용자 목록 확인
-- ===========================================
SELECT 
  'All Pro Users' as info,
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = 'pro'::plan_type AND up.plan_label = 'pro'
ORDER BY up.updated_at DESC;

-- ===========================================
-- 롤백용 SQL (필요시 사용)
-- ===========================================
-- 만약 롤백이 필요하다면 아래 SQL 실행
-- UPDATE user_plan 
-- SET 
--   plan = 'RealE'::plan_type,
--   plan_label = 'RealE',
--   pro_until = NULL,
--   updated_at = NOW()
-- WHERE user_id IN (
--   SELECT id FROM auth.users 
--   WHERE email IN ('bflymam@naver.com', 'wkj719@naver.com')
-- );
