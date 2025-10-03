-- user_plan 테이블 구조 확인 SQL
-- 실행해서 실제 컬럼 타입을 확인하세요

-- 1. 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_plan' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 현재 데이터 샘플 확인
SELECT * FROM user_plan LIMIT 5;

-- 3. plan 컬럼의 고유값 확인
SELECT DISTINCT plan, plan_label FROM user_plan;

-- 4. plan 컬럼의 데이터 타입 확인
SELECT 
  plan,
  pg_typeof(plan) as plan_type,
  plan_label,
  pg_typeof(plan_label) as plan_label_type
FROM user_plan 
LIMIT 3;
