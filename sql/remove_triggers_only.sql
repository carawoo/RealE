-- 트리거만 삭제하여 회원가입 테스트
-- 단계별로 문제를 해결하기 위해 먼저 트리거만 제거

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
-- STEP 2: 모든 트리거 삭제
-- ===========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_new_user_pro_plan ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_safe ON auth.users;

-- ===========================================
-- STEP 3: 삭제 확인
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
-- STEP 4: 함수들도 정리 (선택사항)
-- ===========================================
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP FUNCTION IF EXISTS public.handle_new_user_pro_plan();
-- DROP FUNCTION IF EXISTS public.handle_new_user_simple();
