-- 간단한 특정 사용자 업데이트 SQL
-- 중복 키 오류 없이 안전하게 실행

-- ===========================================
-- 1단계: 현재 상태 확인
-- ===========================================
SELECT 
  'Current status' as info,
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
-- 2단계: 안전한 UPDATE 실행
-- ===========================================
-- INSERT 대신 UPDATE만 사용하여 중복 키 오류 방지
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
-- 3단계: 결과 확인
-- ===========================================
SELECT 
  'After update' as info,
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
-- 4단계: 전체 Pro 사용자 현황
-- ===========================================
SELECT 
  'All Pro users' as info,
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = 'pro'::plan_type
ORDER BY up.updated_at DESC;
