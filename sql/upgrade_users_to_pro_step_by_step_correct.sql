-- 정확한 테이블 구조 기반 단계별 사용자 Pro 플랜 업그레이드 SQL
-- plan 컬럼이 ENUM 타입임을 반영한 안전한 단계별 실행

-- ===========================================
-- STEP 1: ENUM 타입 확인
-- ===========================================
-- 먼저 plan_type ENUM의 가능한 값들을 확인
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder as sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'plan_type'
ORDER BY e.enumsortorder;

-- ===========================================
-- STEP 2: 현재 상태 확인
-- ===========================================
SELECT 
  'BEFORE UPDATE - Current Status' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- STEP 3: 업데이트 대상 사용자 확인
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
WHERE up.plan_label = 'free' OR up.plan_label IS NULL;

-- ===========================================
-- STEP 4: user_plan에 없는 사용자 확인
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
-- STEP 5: Free 사용자만 Pro로 업그레이드
-- ===========================================
-- 이 단계만 실행하고 결과를 확인한 후 다음 단계 진행
UPDATE user_plan 
SET 
  plan = 'pro'::plan_type,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE plan_label = 'free' OR plan_label IS NULL;

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
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, updated_at)
SELECT 
  au.id,
  'pro'::plan_type,
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
-- STEP 7: 최종 결과 확인
-- ===========================================
-- 모든 작업 완료 후 최종 상태 확인
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
-- STEP 8: Pro 사용자 상세 정보
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
WHERE up.plan = 'pro'::plan_type AND up.plan_label = 'pro'
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
WHERE plan = 'pro'::plan_type AND plan_label = 'pro'
UNION ALL
SELECT 
  'RealE Users (unchanged)' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'RealE'::plan_type
UNION ALL
SELECT 
  'Plus Users (unchanged)' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'Plus'::plan_type
UNION ALL
SELECT 
  'Free/Null Users (remaining)' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan_label = 'free' OR plan_label IS NULL;

-- ===========================================
-- EMERGENCY ROLLBACK (문제 발생시에만 사용)
-- ===========================================
-- 문제가 발생한 경우에만 아래 SQL 실행
-- UPDATE user_plan 
-- SET 
--   plan = 'RealE'::plan_type,
--   plan_label = 'free',
--   pro_until = NULL,
--   updated_at = NOW()
-- WHERE plan = 'pro'::plan_type 
--   AND plan_label = 'pro'
--   AND updated_at >= NOW() - INTERVAL '2 hours';
