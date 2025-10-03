-- 올바른 ENUM 값을 사용하여 새 유저 자동 Pro 플랜 설정
-- ENUM 값: RealE, Plus, Pro (모두 대문자)

-- ===========================================
-- STEP 1: 기존 사용자들을 Pro로 업그레이드 (올바른 ENUM 값 사용)
-- ===========================================
-- 현재 상태 확인
SELECT 
  'Before Update' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- RealE/free 사용자들을 Pro로 업그레이드 (올바른 ENUM 값 사용)
UPDATE user_plan 
SET 
  plan = 'Pro'::plan_type,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE plan_label = 'RealE' 
   OR plan_label = 'free' 
   OR plan_label IS NULL
   OR plan IS NULL
   OR plan = 'RealE'::plan_type;

-- 업데이트된 행 수 확인
SELECT 
  'Updated rows count' as info,
  COUNT(*) as updated_count
FROM user_plan 
WHERE plan = 'Pro'::plan_type 
  AND plan_label = 'pro'
  AND updated_at >= NOW() - INTERVAL '5 minutes';

-- ===========================================
-- STEP 2: user_plan에 없는 사용자들 추가
-- ===========================================
-- auth.users에는 있지만 user_plan에는 없는 사용자들 추가
INSERT INTO user_plan (user_id, plan, plan_label, pro_until, updated_at)
SELECT 
  au.id,
  'Pro'::plan_type,
  'pro',
  NOW() + INTERVAL '30 days',
  NOW()
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  plan = 'Pro'::plan_type,
  plan_label = 'pro',
  pro_until = NOW() + INTERVAL '30 days',
  updated_at = NOW();

-- 추가된 사용자 수 확인
SELECT 
  'Added users count' as info,
  COUNT(*) as added_count
FROM user_plan 
WHERE plan = 'Pro'::plan_type 
  AND plan_label = 'pro'
  AND updated_at >= NOW() - INTERVAL '5 minutes';

-- ===========================================
-- STEP 3: 새 유저 Pro 플랜 트리거 함수 생성 (올바른 ENUM 값 사용)
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user_pro_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 유저가 생성되면 자동으로 Pro 플랜 할당 (올바른 ENUM 값 사용)
  INSERT INTO public.user_plan (user_id, plan, plan_label, pro_until, updated_at)
  VALUES (NEW.id, 'Pro'::plan_type, 'pro', NOW() + INTERVAL '30 days', NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'Pro'::plan_type,
    plan_label = 'pro',
    pro_until = NOW() + INTERVAL '30 days',
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- STEP 4: 트리거 생성
-- ===========================================
-- auth.users 테이블에 새 유저 생성 시 트리거 추가
DROP TRIGGER IF EXISTS trg_new_user_pro_plan ON auth.users;
CREATE TRIGGER trg_new_user_pro_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_pro_plan();

-- ===========================================
-- STEP 5: 트리거 확인
-- ===========================================
-- 생성된 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- ===========================================
-- STEP 6: 테스트용 시뮬레이션
-- ===========================================
-- 실제 INSERT는 하지 않고 함수만 테스트
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- 가상의 user_id 생성
  test_user_id := gen_random_uuid();
  
  -- 함수 직접 호출 (실제 INSERT 없이)
  PERFORM public.handle_new_user_pro_plan() FROM (SELECT test_user_id as id) as dummy;
  
  -- 결과 확인
  RAISE NOTICE 'Test completed for user_id: %', test_user_id;
END $$;

-- ===========================================
-- STEP 7: 최종 결과 확인
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

-- Pro 플랜 사용자들의 상세 정보 확인
SELECT 
  au.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM user_plan up
JOIN auth.users au ON up.user_id = au.id
WHERE up.plan = 'Pro'::plan_type 
  AND up.plan_label = 'pro'
ORDER BY up.updated_at DESC
LIMIT 10;

-- ===========================================
-- STEP 8: 통계 요약
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
WHERE plan = 'Pro'::plan_type AND plan_label = 'pro'
UNION ALL
SELECT 
  'Users without Pro Plan' as metric,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN user_plan up ON au.id = up.user_id
WHERE up.user_id IS NULL OR up.plan != 'Pro'::plan_type;
