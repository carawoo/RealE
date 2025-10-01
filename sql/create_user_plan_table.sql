-- user_plan 테이블 생성
CREATE TABLE IF NOT EXISTS user_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan BOOLEAN DEFAULT FALSE,
  plan_label TEXT DEFAULT 'free',
  pro_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_plan_user_id ON user_plan(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_pro_until ON user_plan(pro_until);

-- RLS 활성화
ALTER TABLE user_plan ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 플랜만 조회 가능
CREATE POLICY "Users can view their own plan" 
  ON user_plan 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- RLS 정책: 누구나 삽입 가능 (회원가입 시)
CREATE POLICY "Anyone can insert user plan" 
  ON user_plan 
  FOR INSERT 
  WITH CHECK (true);

-- RLS 정책: 사용자는 자신의 플랜만 업데이트 가능
CREATE POLICY "Users can update their own plan" 
  ON user_plan 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- 트리거: 새 사용자 생성 시 자동으로 user_plan에 레코드 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_plan (user_id, plan, plan_label)
  VALUES (NEW.id, FALSE, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_plan_updated ON user_plan;
CREATE TRIGGER on_user_plan_updated
  BEFORE UPDATE ON user_plan
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

