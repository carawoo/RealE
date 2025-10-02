-- 탈퇴한 사용자 현황 확인

-- 1. user_stats_kst에서 탈퇴한 사용자 수 확인
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted_users,
    COUNT(CASE WHEN is_deleted = false THEN 1 END) as active_users
FROM user_stats_kst;

-- 2. user_plan에 있는 사용자 중 탈퇴한 사용자 확인
SELECT 
    up.user_id,
    up.plan,
    up.plan_label,
    usk.email,
    usk.is_deleted
FROM user_plan up
JOIN user_stats_kst usk ON up.user_id = usk.id
WHERE usk.is_deleted = true
ORDER BY up.updated_at DESC;
