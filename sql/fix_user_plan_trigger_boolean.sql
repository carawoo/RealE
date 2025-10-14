-- user_plan 테이블의 plan 컬럼이 BOOLEAN 타입이므로 
-- 트리거 함수를 BOOLEAN 타입에 맞게 수정

-- ===========================================
-- STEP 1: 현재 user_plan 테이블 구조 확인
-- ===========================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_plan' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===========================================
-- STEP 2: BOOLEAN 타입에 맞는 트리거 함수 생성
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 유저가 생성되면 자동으로 Pro 플랜 할당 (BOOLEAN 타입 사용)
  INSERT INTO public.user_plan (user_id, plan, plan_label, pro_until, updated_at)
  VALUES (NEW.id, TRUE, 'Pro', NOW() + INTERVAL '30 days', NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    plan = TRUE,
    plan_label = 'Pro',
    pro_until = NOW() + INTERVAL '30 days',
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- STEP 3: 트리거 재생성
-- ===========================================
-- 기존 트리거들 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_new_user_pro_plan ON auth.users;

-- 새로운 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- STEP 4: 트리거 확인
-- ===========================================
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
-- STEP 5: 테스트용 시뮬레이션
-- ===========================================
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- 가상의 user_id 생성
  test_user_id := gen_random_uuid();
  
  -- 함수 직접 호출 (실제 INSERT 없이)
  PERFORM public.handle_new_user() FROM (SELECT test_user_id as id) as dummy;
  
  -- 결과 확인
  RAISE NOTICE 'Test completed for user_id: %', test_user_id;
END $$;

-- ===========================================
-- STEP 6: 현재 사용자들의 플랜 상태 확인
-- ===========================================
SELECT 
  'Current Plan Status' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;

-- ===========================================
-- STEP 7: 기존 사용자들을 Pro로 업그레이드 (필요시)
-- ===========================================
-- free 사용자들을 Pro로 업그레이드
UPDATE user_plan 
SET 
  plan = TRUE,
  plan_label = 'Pro',
  pro_until = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE plan = FALSE 
   OR plan_label = 'free' 
   OR plan_label IS NULL;

-- 업그레이드 결과 확인
SELECT 
  'After Upgrade' as status,
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;
