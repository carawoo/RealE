-- user_plan 테이블 데이터 정합성 수정

-- 1. 현재 상태 확인
SELECT 
    user_id, 
    plan, 
    plan_label, 
    pro_until,
    updated_at
FROM user_plan 
ORDER BY updated_at DESC;

-- 2. plan 컬럼 값 정리 (모든 값을 Pro로 통일)
UPDATE user_plan 
SET 
    plan = 'Pro'::plan_type,
    plan_label = 'pro',
    updated_at = NOW()
WHERE plan != 'Pro'::plan_type OR plan_label != 'pro';

-- 3. 결과 확인
SELECT 
    user_id, 
    plan, 
    plan_label, 
    pro_until,
    updated_at
FROM user_plan 
ORDER BY updated_at DESC;
