-- ============================================
-- 프로덕션 안전 트리거 수정 스크립트
-- ============================================
-- 이 스크립트는 기존 사용자에게 영향을 주지 않습니다.
-- 새로운 회원가입만 정상 작동하도록 수정합니다.

-- 1단계: 기존 트리거 확인 및 백업 (실행 안함, 참고용)
-- SELECT * FROM pg_trigger WHERE tgname LIKE '%user%';

-- 2단계: 손상된 트리거들 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_new_user_pro_plan ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_safe ON auth.users;

-- 3단계: 새로운 안전한 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 유저가 생성되면 자동으로 Pro 플랜 할당
  INSERT INTO public.user_plan (user_id, plan, plan_label, pro_until, updated_at)
  VALUES (
    NEW.id, 
    TRUE,  -- BOOLEAN 타입
    'Pro', -- 대문자 P
    NOW() + INTERVAL '30 days', 
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = TRUE,
    plan_label = 'Pro',
    pro_until = NOW() + INTERVAL '30 days',
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 에러가 발생해도 사용자 생성은 계속 진행
  RAISE WARNING 'Failed to create user_plan for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4단계: 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5단계: 검증 (선택사항)
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- ============================================
-- 실행 후 테스트:
-- 1. 새로운 이메일로 회원가입 시도
-- 2. auth.users와 user_plan 테이블 확인
-- ============================================

