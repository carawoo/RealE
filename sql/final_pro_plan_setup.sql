-- 새 유저 자동 Pro 플랜 설정 (최종 버전)
-- 트리거 함수 테스트 부분 제거

-- ===========================================
-- STEP 1: 새 유저 Pro 플랜 트리거 함수 생성
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user_pro_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 유저가 생성되면 자동으로 Pro 플랜 할당
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
-- STEP 2: 트리거 생성
-- ===========================================
-- auth.users 테이블에 새 유저 생성 시 트리거 추가
DROP TRIGGER IF EXISTS trg_new_user_pro_plan ON auth.users;
CREATE TRIGGER trg_new_user_pro_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_pro_plan();

-- ===========================================
-- STEP 3: 트리거 확인
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
-- STEP 4: 현재 상태 확인
-- ===========================================
-- 현재 플랜별 사용자 수 확인
SELECT 
  'Current Status' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- STEP 5: Pro 플랜 사용자 목록 확인
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
WHERE up.plan = 'Pro'::plan_type 
  AND up.plan_label = 'pro'
ORDER BY up.updated_at DESC
LIMIT 10;

-- ===========================================
-- STEP 6: 통계 요약
-- ===========================================
-- 전체 사용자 통계
SELECT 
  'Total Users in auth.users' as metric,
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
