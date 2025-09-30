-- recommendations 테이블 생성
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (모든 사용자가 공개된 추천을 읽을 수 있음)
CREATE POLICY "Anyone can read public recommendations" ON public.recommendations
    FOR SELECT USING (is_public = true);

-- 사용자별 쓰기 정책 (인증된 사용자가 자신의 추천을 생성할 수 있음)
CREATE POLICY "Users can insert their own recommendations" ON public.recommendations
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (user_id IS NULL OR user_id = auth.uid())
    );

-- 사용자별 업데이트 정책 (사용자가 자신의 추천을 수정할 수 있음)
CREATE POLICY "Users can update their own recommendations" ON public.recommendations
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        (user_id IS NULL OR user_id = auth.uid())
    );

-- 사용자별 삭제 정책 (사용자가 자신의 추천을 삭제할 수 있음)
CREATE POLICY "Users can delete their own recommendations" ON public.recommendations
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        (user_id IS NULL OR user_id = auth.uid())
    );

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_recommendations_slug ON public.recommendations(slug);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_is_public ON public.recommendations(is_public);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON public.recommendations(created_at);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recommendations_updated_at 
    BEFORE UPDATE ON public.recommendations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
