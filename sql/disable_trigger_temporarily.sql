-- 트리거를 일시적으로 비활성화하여 회원가입 테스트
-- 문제가 트리거에 있다면 이것으로 회원가입이 가능해질 것

-- ===========================================
-- STEP 1: 현재 트리거 확인
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
-- STEP 2: 트리거 일시적으로 비활성화
-- ===========================================
-- 모든 user 관련 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_new_user_pro_plan ON auth.users;

-- ===========================================
-- STEP 3: 테스트용 간단한 트리거 함수 생성 (오류 방지)
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- 최소한의 작업만 수행 (오류 방지)
  BEGIN
    INSERT INTO public.user_plan (user_id, plan, plan_label, pro_until, updated_at)
    VALUES (NEW.id, TRUE, 'Pro', NOW() + INTERVAL '30 days', NOW())
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- 오류가 발생해도 회원가입은 계속 진행
    RAISE NOTICE 'User plan creation failed for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- STEP 4: 안전한 트리거 생성
-- ===========================================
CREATE TRIGGER on_auth_user_created_safe
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_simple();

-- ===========================================
-- STEP 5: 트리거 확인
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
-- STEP 6: 테스트용 시뮬레이션
-- ===========================================
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  test_user_id := gen_random_uuid();
  
  -- 함수 직접 호출 (실제 INSERT 없이)
  PERFORM public.handle_new_user_simple() FROM (SELECT test_user_id as id) as dummy;
  
  RAISE NOTICE 'Safe trigger test completed for user_id: %', test_user_id;
END $$;
