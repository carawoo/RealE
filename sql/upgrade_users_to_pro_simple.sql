-- 간단하고 안전한 사용자 Pro 플랜 업그레이드 SQL
-- created_at 컬럼 오류 수정, 최소한의 안전한 업그레이드

-- ===========================================
-- 1단계: 현재 상태 확인
-- ===========================================
SELECT 
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- 2단계: Free 사용자만 Pro로 업그레이드
-- ===========================================
UPDATE user_plan 
SET 
  plan = 'pro',
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE (plan = 'free' OR plan IS NULL) 
  AND (plan_label = 'free' OR plan_label IS NULL);

-- ===========================================
-- 3단계: user_plan에 없는 사용자 추가
-- ===========================================
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

-- ===========================================
-- 4단계: 결과 확인
-- ===========================================
SELECT 
  'FINAL RESULT' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- 5단계: Pro 사용자 목록
-- ===========================================
SELECT 
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = 'pro' AND up.plan_label = 'pro'
ORDER BY up.updated_at DESC;
