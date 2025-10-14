-- ============================================
-- 트리거 상태 확인 쿼리
-- ============================================

-- 1. 현재 존재하는 모든 트리거 확인
SELECT 
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name,
  t.tgenabled AS enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users' 
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');

-- 2. handle_new_user 함수 존재 확인
SELECT 
  proname AS function_name,
  prosrc AS function_body
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. user_plan 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_plan'
ORDER BY ordinal_position;

-- 4. 최근 생성된 사용자 확인 (에러 로그 확인용)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 5. user_plan 데이터 확인
SELECT 
  up.user_id,
  u.email,
  up.plan,
  up.plan_label,
  up.pro_until,
  up.updated_at
FROM public.user_plan up
LEFT JOIN auth.users u ON up.user_id = u.id
ORDER BY up.updated_at DESC
LIMIT 5;

