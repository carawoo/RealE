-- 새 유저 자동 Pro 플랜 설정을 위한 트리거 생성
-- 기존 트리거들과 충돌하지 않도록 별도 트리거 생성

-- ===========================================
-- STEP 1: 현재 ENUM 타입 확인
-- ===========================================
-- plan_type ENUM의 가능한 값들 확인
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder as sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'plan_type'
ORDER BY e.enumsortorder;

-- ===========================================
-- STEP 2: 새 유저 Pro 플랜 트리거 함수 생성
-- ===========================================
-- 기존 handle_new_user 함수가 있다면 교체, 없다면 생성
CREATE OR REPLACE FUNCTION public.handle_new_user_pro_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 유저가 생성되면 자동으로 Pro 플랜 할당
  INSERT INTO public.user_plan (user_id, plan, plan_label, pro_until, updated_at)
  VALUES (NEW.id, 'pro'::plan_type, 'pro', NOW() + INTERVAL '30 days', NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'pro'::plan_type,
    plan_label = 'pro',
    pro_until = NOW() + INTERVAL '30 days',
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- STEP 3: 트리거 생성
-- ===========================================
-- auth.users 테이블에 새 유저 생성 시 트리거 추가
DROP TRIGGER IF EXISTS trg_new_user_pro_plan ON auth.users;
CREATE TRIGGER trg_new_user_pro_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_pro_plan();

-- ===========================================
-- STEP 4: 트리거 확인
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
-- STEP 5: 테스트용 시뮬레이션
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
-- STEP 6: 결과 확인
-- ===========================================
-- 최근 생성된 user_plan 레코드 확인
SELECT 
  user_id,
  plan,
  plan_label,
  pro_until,
  updated_at
FROM user_plan 
ORDER BY updated_at DESC 
LIMIT 10;

-- ===========================================
-- STEP 7: 통계 확인
-- ===========================================
-- 플랜별 사용자 수 확인
SELECT 
  plan,
  plan_label,
  COUNT(*) as user_count
FROM user_plan 
GROUP BY plan, plan_label
ORDER BY plan, plan_label;
