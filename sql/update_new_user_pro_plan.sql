-- 새로 가입하는 유저들이 자동으로 Pro 플랜을 받도록 트리거 함수 업데이트

-- 기존 트리거 함수 업데이트
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_plan (user_id, plan, plan_label, pro_until)
  VALUES (NEW.id, TRUE, 'Pro'::text, NOW() + INTERVAL '30 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 이미 존재하므로 재생성할 필요 없음
-- 트리거는 이미 auth.users 테이블에 연결되어 있음
