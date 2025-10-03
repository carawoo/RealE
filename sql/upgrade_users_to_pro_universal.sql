-- 범용 사용자 Pro 플랜 업그레이드 SQL
-- plan 컬럼 타입에 관계없이 작동하는 안전한 버전

-- 1. 현재 상태 확인
SELECT 
  'Current Status' as info,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan_label
ORDER BY plan_label;

-- 2. plan_label 기준으로만 업데이트 (가장 안전한 방법)
UPDATE user_plan 
SET 
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE plan_label = 'free' OR plan_label IS NULL;

-- 3. plan 컬럼도 함께 업데이트 (타입에 따라 자동 처리)
-- boolean인 경우
UPDATE user_plan 
SET plan = TRUE
WHERE plan_label = 'pro' AND (plan = FALSE OR plan IS NULL);

-- 문자열인 경우 (위의 UPDATE가 실패하면 이걸 실행)
-- UPDATE user_plan 
-- SET plan = 'pro'
-- WHERE plan_label = 'pro' AND (plan = 'free' OR plan IS NULL);

-- 4. user_plan에 없는 사용자들 추가
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, created_at, updated_at)
SELECT 
  au.id,
  TRUE,  -- boolean으로 시도
  'pro',
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW();

-- 5. plan 컬럼 업데이트 (conflict 후)
UPDATE user_plan 
SET plan = TRUE
WHERE plan_label = 'pro' AND (plan = FALSE OR plan IS NULL);

-- 6. 결과 확인
SELECT 
  'After Update' as status,
  plan_label,
  COUNT(*) as user_count,
  MIN(created_at) as earliest_created,
  MAX(updated_at) as latest_updated
FROM user_plan 
GROUP BY plan_label
ORDER BY plan_label;

-- 7. Pro 사용자 상세 정보
SELECT 
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.created_at,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan_label = 'pro'
ORDER BY up.updated_at DESC
LIMIT 10;

-- 8. 최종 통계
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
WHERE plan_label = 'pro'
UNION ALL
SELECT 
  'Free Users' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan_label = 'free' OR plan_label IS NULL;

-- 9. 에러 발생 시 롤백용 SQL
-- UPDATE user_plan 
-- SET 
--   plan_label = 'free',
--   pro_until = NULL,
--   updated_at = NOW()
-- WHERE plan_label = 'pro';
