-- user_plan 테이블의 실제 컬럼 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_plan' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
