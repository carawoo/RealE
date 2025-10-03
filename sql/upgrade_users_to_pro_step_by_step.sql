-- 단계별 사용자 Pro 플랜 업그레이드 SQL
-- 더 안전한 방식으로 단계별로 실행할 수 있습니다.

-- ===========================================
-- 1단계: 현재 상태 확인
-- ===========================================
-- 실행 전 현재 상태를 확인합니다.
SELECT 
  'Before Update' as status,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan_label
ORDER BY plan_label;

-- ===========================================
-- 2단계: 백업 테이블 생성 (선택사항)
-- ===========================================
-- 기존 데이터를 백업하고 싶다면 실행
CREATE TABLE IF NOT EXISTS user_plan_backup AS 
SELECT * FROM user_plan;

-- ===========================================
-- 3단계: Free 사용자만 Pro로 업그레이드
-- ===========================================
-- Free 플랜 사용자들을 Pro로 업그레이드
UPDATE user_plan 
SET 
  plan = TRUE,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year', -- 만료일 설정 (필요시 조정)
  updated_at = NOW()
WHERE plan = FALSE OR plan_label = 'free';

-- ===========================================
-- 4단계: user_plan에 없는 사용자들 추가
-- ===========================================
-- auth.users에는 있지만 user_plan에는 없는 사용자들을 Pro로 추가
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, created_at, updated_at)
SELECT 
  au.id,
  TRUE,
  'pro',
  NOW() + INTERVAL '1 year',
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  plan = TRUE,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW();

-- ===========================================
-- 5단계: 결과 확인
-- ===========================================
-- 업데이트 후 상태 확인
SELECT 
  'After Update' as status,
  plan_label,
  COUNT(*) as user_count,
  MIN(created_at) as earliest_created,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan_label
ORDER BY plan_label;

-- ===========================================
-- 6단계: 상세 정보 확인
-- ===========================================
-- Pro 사용자들의 상세 정보
SELECT 
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.created_at,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = TRUE
ORDER BY up.updated_at DESC;

-- ===========================================
-- 7단계: 최종 통계
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
WHERE plan = TRUE AND plan_label = 'pro'
UNION ALL
SELECT 
  'Free Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = FALSE OR plan_label = 'free';

-- ===========================================
-- 롤백용 SQL (필요시 사용)
-- ===========================================
-- 만약 롤백이 필요하다면 아래 SQL을 실행
-- UPDATE user_plan 
-- SET 
--   plan = FALSE,
--   plan_label = 'free',
--   pro_until = NULL,
--   updated_at = NOW()
-- WHERE plan = TRUE AND plan_label = 'pro';
