-- plan 컬럼의 정확한 ENUM 타입 확인
SELECT 
  t.typname AS enum_type_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname IN (
  SELECT udt_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'user_plan' 
    AND column_name = 'plan'
)
ORDER BY e.enumsortorder;

