-- 기존 사용자들을 Pro 플랜으로 업그레이드
-- 새 유저 트리거 적용 전에 기존 사용자들도 Pro로 설정

-- ===========================================
-- STEP 1: 현재 상태 확인
-- ===========================================
-- 현재 플랜별 사용자 수 확인
SELECT 
  'Before Update' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- STEP 2: RealE/free 사용자들을 Pro로 업그레이드
-- ===========================================
-- 현재 RealE 또는 free 플랜인 사용자들을 Pro로 업그레이드
UPDATE user_plan 
SET 
  plan = 'pro'::plan_type,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE plan_label = 'RealE' 
   OR plan_label = 'free' 
   OR plan_label IS NULL
   OR plan IS NULL;

-- 업데이트된 행 수 확인
SELECT 
  'Updated rows count' as info,
  COUNT(*) as updated_count
FROM user_plan 
WHERE plan = 'pro'::plan_type 
  AND plan_label = 'pro'
  AND updated_at >= NOW() - INTERVAL '5 minutes';

-- ===========================================
-- STEP 3: user_plan에 없는 사용자들 추가
-- ===========================================
-- auth.users에는 있지만 user_plan에는 없는 사용자들 추가
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, updated_at)
SELECT 
  au.id,
  'pro'::plan_type,
  'pro',
  NOW() + INTERVAL '30 days',
  NOW()
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  plan = 'pro'::plan_type,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '30 days',
  updated_at = NOW();

-- 추가된 사용자 수 확인
SELECT 
  'Added users count' as info,
  COUNT(*) as added_count
FROM user_plan 
WHERE plan = 'pro'::plan_type 
  AND plan_label = 'pro'
  AND updated_at >= NOW() - INTERVAL '5 minutes';

-- ===========================================
-- STEP 4: 최종 상태 확인
-- ===========================================
-- 업그레이드 후 플랜별 사용자 수 확인
SELECT 
  'After Update' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- STEP 5: Pro 사용자 목록 확인
-- ===========================================
-- Pro 플랜 사용자들의 상세 정보 확인
SELECT 
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = 'pro'::plan_type 
  AND up.plan_label = 'pro'
ORDER BY up.updated_at DESC
LIMIT 20;

-- ===========================================
-- STEP 6: 통계 요약
-- ===========================================
-- 전체 사용자 통계
SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Users with Pro Plan' as metric,
  COUNT(*) as count
FROM user_plan 
WHERE plan = 'pro'::plan_type AND plan_label = 'pro'
UNION ALL
SELECT 
  'Users without Pro Plan' as metric,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL OR up.plan != 'pro'::plan_type;
