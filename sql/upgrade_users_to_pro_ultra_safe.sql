-- 초안전한 사용자 Pro 플랜 업그레이드 SQL
-- 각 단계를 개별적으로 실행하여 안전성 극대화

-- ===========================================
-- STEP 1: 현재 상태 완전 분석
-- ===========================================
-- 실행 전 반드시 이 쿼리로 현재 상태를 확인하세요
SELECT 
  'BEFORE UPDATE - Current Status' as status,
  plan,
  plan_label,
  COUNT(*) as user_count,
  MIN(created_at) as earliest_created,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- STEP 2: 업데이트 대상 사용자 확인
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
-- STEP 3: user_plan에 없는 사용자 확인
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
-- STEP 4: 백업 테이블 생성 (선택사항)
-- ===========================================
-- 기존 데이터를 백업하고 싶다면 실행
-- CREATE TABLE IF NOT EXISTS user_plan_backup_20241003 AS 
-- SELECT * FROM user_plan;

-- ===========================================
-- STEP 5: Free 사용자만 Pro로 업그레이드
-- ===========================================
-- 이 단계만 실행하고 결과를 확인한 후 다음 단계 진행
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
-- STEP 6: user_plan에 없는 사용자 추가
-- ===========================================
-- 이 단계만 실행하고 결과를 확인한 후 다음 단계 진행
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
-- STEP 7: 최종 결과 확인
-- ===========================================
-- 모든 작업 완료 후 최종 상태 확인
SELECT 
  'FINAL RESULT' as status,
  plan,
  plan_label,
  COUNT(*) as user_count,
  MIN(created_at) as earliest_created,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- STEP 8: Pro 사용자 상세 정보
-- ===========================================
-- Pro로 업그레이드된 사용자들의 상세 정보
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
LIMIT 20;

-- ===========================================
-- STEP 9: 최종 통계
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
-- EMERGENCY ROLLBACK (문제 발생시에만 사용)
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
--   AND updated_at >= NOW() - INTERVAL '2 hours';  -- 최근 2시간 내 업데이트만 롤백
