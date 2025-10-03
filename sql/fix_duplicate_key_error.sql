-- 중복 키 오류 해결을 위한 SQL
-- user_plan 테이블의 중복 레코드 확인 및 정리

-- ===========================================
-- 1단계: 중복 레코드 확인
-- ===========================================
-- user_plan 테이블에서 중복된 user_id가 있는지 확인
SELECT 
  'Duplicate user_id check' as info,
  user_id,
  COUNT(*) as duplicate_count
FROM user_plan 
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ===========================================
-- 2단계: 대상 사용자들의 모든 레코드 확인
-- ===========================================
-- bflymam@naver.com과 wkj719@naver.com의 모든 레코드 확인
SELECT 
  'All records for target users' as info,
  au.email,
  up.user_id,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('bflymam@naver.com', 'wkj719@naver.com')
ORDER BY au.email, up.updated_at DESC;

-- ===========================================
-- 3단계: 중복 레코드 정리 (필요시)
-- ===========================================
-- 만약 중복 레코드가 있다면, 가장 최근 것만 남기고 삭제
-- 주의: 이 SQL은 중복이 있을 때만 실행하세요!
-- DELETE FROM user_plan 
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id,
--            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
--     FROM user_plan
--   ) t
--   WHERE rn > 1
-- );

-- ===========================================
-- 4단계: 안전한 UPDATE 실행
-- ===========================================
-- INSERT 대신 UPDATE로 실행
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
-- 5단계: 결과 확인
-- ===========================================
-- 업데이트 결과 확인
SELECT 
  'After safe update' as info,
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
-- 6단계: 최종 상태 확인
-- ===========================================
-- 전체 Pro 사용자 현황
SELECT 
  'Final Pro users status' as info,
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = 'pro'::plan_type
ORDER BY up.updated_at DESC;
