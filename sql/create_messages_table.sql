-- messages 테이블 생성
-- 채팅 메시지 저장용

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE, -- NULL 허용
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  text TEXT, -- 이전 버전 호환성
  fields JSONB,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- RLS 활성화
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 누구나 자기 대화의 메시지를 읽고 쓸 수 있음
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can update their messages" ON messages FOR UPDATE USING (true);

