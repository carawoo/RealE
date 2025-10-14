-- ============================================
-- 올바른 ENUM 타입으로 트리거 수정
-- ============================================

-- 1단계: 기존 트리거 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2단계: 올바른 함수 생성 (ENUM 타입 사용)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 유저가 생성되면 자동으로 Pro 플랜 할당
  INSERT INTO public.user_plan (user_id, plan, plan_label, pro_until, updated_at)
  VALUES (
    NEW.id, 
    'Pro'::plan_type,  -- ENUM 타입으로 캐스팅
    'Pro',             -- plan_label
    NOW() + INTERVAL '30 days', 
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'Pro'::plan_type,
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

-- 3단계: 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 완료! 이제 회원가입이 정상 작동해야 합니다.
-- ============================================

