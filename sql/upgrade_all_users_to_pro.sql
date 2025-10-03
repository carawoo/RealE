-- 모든 사용자를 Pro 플랜으로 업그레이드하는 SQL
-- 실행 전에 백업을 권장합니다.

-- 1. 기존 user_plan 테이블의 모든 사용자를 Pro로 업데이트
UPDATE user_plan 
SET 
  plan = TRUE,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year', -- 1년 후 만료 (필요시 조정)
  updated_at = NOW()
WHERE plan = FALSE OR plan_label = 'free';

-- 2. 새로 가입한 사용자들도 Pro로 설정 (이미 Pro인 사용자는 제외)
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, created_at, updated_at)
SELECT 
  au.id,
  TRUE,
  'pro',
  NOW() + INTERVAL '1 year', -- 1년 후 만료
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL -- user_plan에 없는 사용자들만
ON CONFLICT (user_id) DO UPDATE SET
  plan = TRUE,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW();

-- 3. 결과 확인 쿼리
SELECT 
  plan_label,
  COUNT(*) as user_count,
  MIN(created_at) as earliest_created,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan_label
ORDER BY plan_label;

-- 4. Pro 플랜 사용자 상세 정보 확인
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
ORDER BY up.updated_at DESC
LIMIT 10;

-- 5. 통계 정보
SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Pro Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = TRUE
UNION ALL
SELECT 
  'Free Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = FALSE;
