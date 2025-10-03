-- plan_type ENUM의 가능한 값들 확인
-- ENUM 타입의 정의를 확인하는 SQL

-- 1. plan_type ENUM의 정의 확인
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder as sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'plan_type'
ORDER BY e.enumsortorder;

-- 2. 현재 사용 중인 plan 값들 확인
SELECT DISTINCT 
  plan,
  pg_typeof(plan) as plan_type,
  COUNT(*) as count
FROM user_plan 
GROUP BY plan
ORDER BY plan;

-- 3. plan_label 값들 확인
SELECT DISTINCT 
  plan_label,
  COUNT(*) as count
FROM user_plan 
GROUP BY plan_label
ORDER BY plan_label;
