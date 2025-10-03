-- 특정 사용자 Pro 플랜 업그레이드 - 단계별 안전 실행
-- bflymam@naver.com과 wkj719@naver.com 사용자 대상

-- ===========================================
-- STEP 1: 대상 사용자 확인
-- ===========================================
-- 먼저 이 두 사용자가 실제로 존재하는지 확인
SELECT 
  'Step 1: Check if target users exist' as info,
  au.email,
  au.id as user_id,
  au.created_at as user_created_at
FROM auth.users au
WHERE au.email IN ('bflymam@naver.com', 'wkj719@naver.com')
ORDER BY au.email;

-- ===========================================
-- STEP 2: 현재 플랜 상태 확인
-- ===========================================
-- 이 사용자들의 현재 플랜 상태 확인
SELECT 
  'Step 2: Current plan status' as info,
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
-- STEP 3: 업그레이드 실행
-- ===========================================
-- 이 단계만 실행하고 결과를 확인한 후 다음 단계 진행
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

-- 업데이트된 행 수 확인
SELECT 
  'Step 3: Rows updated' as info,
  COUNT(*) as updated_count
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('bflymam@naver.com', 'wkj719@naver.com')
  AND up.plan = 'pro'::plan_type
  AND up.plan_label = 'pro';

-- ===========================================
-- STEP 4: 업그레이드 결과 확인
-- ===========================================
-- 업그레이드가 성공적으로 완료되었는지 확인
SELECT 
  'Step 4: Upgrade result verification' as info,
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
-- STEP 5: 전체 Pro 사용자 현황
-- ===========================================
-- 전체 Pro 사용자 현황 확인
SELECT 
  'Step 5: All Pro users overview' as info,
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
-- STEP 6: 최종 통계
-- ===========================================
-- 최종 통계 확인
SELECT 
  'Step 6: Final statistics' as info,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- EMERGENCY ROLLBACK (문제 발생시에만 사용)
-- ===========================================
-- 문제가 발생한 경우에만 아래 SQL 실행
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
