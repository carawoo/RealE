-- 새로 가입하는 유저들이 자동으로 Pro 플랜을 받도록 트리거 함수 수정
-- 기존 트리거에서 plan = TRUE 대신 plan = 'pro'::plan_type으로 수정

-- ===========================================
-- STEP 1: 현재 ENUM 타입 확인
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
-- STEP 2: 현재 트리거 함수 확인
-- ===========================================
-- 현재 handle_new_user 함수의 정의 확인
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- ===========================================
-- STEP 3: 트리거 함수 수정
-- ===========================================
-- plan 컬럼을 올바른 enum 값으로 설정
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
-- STEP 4: 트리거가 존재하는지 확인
-- ===========================================
-- auth.users 테이블에 연결된 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth'
  AND trigger_name LIKE '%user%';

-- ===========================================
-- STEP 5: 트리거 재생성 (필요시)
-- ===========================================
-- 만약 트리거가 없다면 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- STEP 6: 테스트용 새 유저 생성 시뮬레이션
-- ===========================================
-- 실제로는 auth.users에 INSERT가 발생하면 자동으로 실행됨
-- 수동으로 테스트하려면 아래 주석을 해제하고 실행
/*
-- 테스트용 더미 데이터 (실제 auth.users에 INSERT하지 마세요!)
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- 가상의 user_id 생성
  test_user_id := gen_random_uuid();
  
  -- handle_new_user 함수 직접 호출
  PERFORM public.handle_new_user() FROM (SELECT test_user_id as id) as dummy;
  
  -- 결과 확인
  RAISE NOTICE 'Test user_id: %', test_user_id;
END $$;

-- 테스트 결과 확인
SELECT 
  user_id,
  plan,
  plan_label,
  pro_until,
  updated_at
FROM user_plan 
ORDER BY updated_at DESC 
LIMIT 5;
*/
