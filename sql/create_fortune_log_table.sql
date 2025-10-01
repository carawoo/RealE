-- fortune_log 테이블 생성
-- 부동산 사주/타로 콘텐츠 로그 저장용

CREATE TABLE IF NOT EXISTS fortune_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id TEXT NOT NULL,
  property_name TEXT,
  property_type TEXT,
  property_price TEXT,
  user_name TEXT,
  user_birth TEXT,
  fortune_text TEXT NOT NULL,
  fortune_keywords JSONB,
  image_url TEXT,
  share_slug TEXT UNIQUE,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_fortune_log_user_id ON fortune_log(user_id);
CREATE INDEX IF NOT EXISTS idx_fortune_log_property_id ON fortune_log(property_id);
CREATE INDEX IF NOT EXISTS idx_fortune_log_share_slug ON fortune_log(share_slug);
CREATE INDEX IF NOT EXISTS idx_fortune_log_created_at ON fortune_log(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE fortune_log ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 운세 기록을 볼 수 있음
CREATE POLICY "Users can view their own fortune logs"
  ON fortune_log
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 모든 사용자가 운세를 생성할 수 있음
CREATE POLICY "Anyone can create fortune logs"
  ON fortune_log
  FOR INSERT
  WITH CHECK (true);

-- share_slug로 공개된 운세는 누구나 볼 수 있음
CREATE POLICY "Anyone can view shared fortune logs"
  ON fortune_log
  FOR SELECT
  USING (share_slug IS NOT NULL);

-- 업데이트 트리거 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_fortune_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fortune_log_updated_at
  BEFORE UPDATE ON fortune_log
  FOR EACH ROW
  EXECUTE FUNCTION update_fortune_log_updated_at();

-- 코멘트 추가
COMMENT ON TABLE fortune_log IS '부동산 사주/타로 콘텐츠 로그';
COMMENT ON COLUMN fortune_log.fortune_keywords IS '운세 키워드 배열 (예: ["재물운 상승", "가정운 안정"])';
COMMENT ON COLUMN fortune_log.share_slug IS '공유용 고유 slug (예: abc123)';
COMMENT ON COLUMN fortune_log.view_count IS '조회수';
COMMENT ON COLUMN fortune_log.share_count IS '공유 횟수';

