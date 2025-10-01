-- conversations 테이블 생성
-- 대화 세션 관리용

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- RLS 활성화
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 누구나 대화를 생성하고 읽을 수 있음
CREATE POLICY "Anyone can insert conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select conversations" ON conversations FOR SELECT USING (true);
CREATE POLICY "Anyone can update their conversations" ON conversations FOR UPDATE USING (true);

