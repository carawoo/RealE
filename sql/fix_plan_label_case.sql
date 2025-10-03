-- 현재 사용자들의 플랜 상태 확인
SELECT 
  user_id,
  plan,
  plan_label,
  pro_until,
  updated_at
FROM user_plan 
ORDER BY updated_at DESC 
LIMIT 10;

-- plan_label 대소문자 통일
UPDATE user_plan 
SET plan_label = LOWER(plan_label)
WHERE plan_label IS NOT NULL;

-- Pro 플랜 사용자들의 plan_label을 'pro'로 설정
UPDATE user_plan 
SET plan_label = 'pro'
WHERE plan = true OR plan_label ILIKE '%pro%';

-- Plus 플랜 사용자들의 plan_label을 'plus'로 설정  
UPDATE user_plan 
SET plan_label = 'plus'
WHERE plan_label ILIKE '%plus%';

-- 결과 확인
SELECT 
  user_id,
  plan,
  plan_label,
  pro_until,
  updated_at
FROM user_plan 
WHERE plan_label IS NOT NULL
ORDER BY updated_at DESC;
