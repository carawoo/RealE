# RealE - 부동산 대출 AI 비서

내 집 마련을 위한 스마트한 대출 시나리오 분석 서비스

## 🏠 주요 기능

### 💰 3종 대출 시나리오 분석
- **최대 한도형**: 구매력을 극대화하는 시나리오
- **안전 상환형**: 부채를 최소화하는 안전한 시나리오  
- **정책 활용형**: 정부 지원 프로그램을 활용한 시나리오

### 📊 상세 분석 정보
- 월 상환액 (원리금균등상환 방식)
- 총 이자 계산
- LTV/DSR 비율 분석
- 정책 지원금 매칭
- 실제 신청 링크 제공

### 🎯 지원 정책 프로그램
- 디딤돌대출 (일반)
- 보금자리론 (생애최초)
- 신생아 특례대출
- 다자녀 특례대출

## 🚀 사용 방법

### 1. 자연어 입력
```
"월소득 500만원, 5억원 집 구입, 자기자본 1억원"
```

### 2. 시나리오 결과 확인
- 3가지 대출 시나리오 비교
- 각 시나리오별 상세 정보
- 정책 지원 프로그램 안내

### 3. 신청 링크 이용
- 바로 연결되는 정책자금 신청 페이지
- 실시간 정책 정보 반영

## 🛠 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase
- **Styling**: CSS Modules
- **Deployment**: Vercel

## 📱 화면 구성

- **홈페이지**: 서비스 소개 및 주요 기능 안내
- **채팅 인터페이스**: 자연어 기반 상담 시스템
- **결과 카드**: 시나리오별 상세 정보 표시
- **FAQ**: 자주 묻는 질문과 답변

## 🔧 개발 환경 설정

### 환경 변수
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
# 선택: 기본값은 gpt-4o-mini
OPENAI_MODEL=gpt-4o-mini
```

### 설치 및 실행
```bash
npm install
npm run dev
```

## 📋 API 엔드포인트

- `POST /api/compute`: 대출 시나리오 계산
- `POST /api/share`: 결과 공유
- `GET /api/conversations/new`: 새 대화 생성

## 💡 주요 특징

- **실시간 계산**: 입력과 동시에 시나리오 생성
- **정확한 금융 계산**: 실제 금융 공식 적용
- **정책 연동**: 최신 정부 지원 정책 반영
- **사용자 친화적**: 복잡한 금융 정보를 쉽게 이해

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해 주세요.