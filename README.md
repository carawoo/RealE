# RealE - 부동산 대출 AI 비서

내 집 마련을 위한 스마트한 대출 시나리오 분석 서비스

## 🏠 주요 기능

### 💰 3종 대출 시나리오 분석
- **최대 한도형**: 구매력을 극대화하는 시나리오
- **안전 상환형**: 부채를 최소화하는 안전한 시나리오  
- **정책 활용형**: 정부 지원 프로그램을 활용한 시나리오

### 🔮 부동산 사주/타로 콘텐츠 (NEW!)
- **AI 운세 생성**: GPT 기반 부동산 매물별 재미있는 사주 콘텐츠
- **타로 카드 이미지**: DALL-E로 생성한 신비로운 카드 이미지
- **SNS 공유**: 카카오톡, 트위터 등으로 간편하게 공유
- **바이럴 마케팅**: 재미있는 콘텐츠로 자연스러운 유입 증가
- 🎮 [데모 페이지 바로가기](/fortune/demo)

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
NEXT_PUBLIC_COPILOT_PUBLIC_API_KEY=your_copilot_public_key
# Supabase Auth
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
# OAuth Providers (Supabase Auth 설정과 동일하게)
SUPABASE_GOOGLE_CLIENT_ID=...
SUPABASE_GOOGLE_CLIENT_SECRET=...
SUPABASE_KAKAO_CLIENT_ID=...
SUPABASE_KAKAO_CLIENT_SECRET=...
# Stripe Checkout (테스트 모드)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_STRIPE_PRICE_ID=price_xxx
STRIPE_SECRET_KEY=sk_test_xxx
# 웹 검색 API (우선순위 순)
SERP_API_KEY=your_serp_api_key  # SerpAPI (Google 검색, 추천)
BRAVE_API_KEY=your_brave_api_key  # Brave Search API
# 한국부동산원 R-ONE API
REB_API_KEY=c6f4cd2862dc42749698e4eeab11b059  # 부동산 통계 정보 조회용
# 카카오맵 API (JavaScript 키)
NEXT_PUBLIC_KAKAO_MAP_KEY=your_kakao_javascript_key  # 지도 표시용
```

> Stripe 테스트 키를 사용하면 `https://real-e.space`에서 결제 플로우를 검증할 수 있습니다. 프로덕션 배포 시에는 실키로 교체하세요.

### 설치 및 실행
```bash
npm install
npm run dev
```

## 📋 API 엔드포인트

### 대출 계산
- `POST /api/compute`: 대출 시나리오 계산
- `POST /api/share`: 결과 공유
- `GET /api/conversations/new`: 새 대화 생성

### 부동산 사주 (NEW!)
- `POST /api/fortune/generate`: AI 운세 텍스트 생성
- `POST /api/fortune/image`: 타로 카드 이미지 생성
- `POST /api/fortune/share`: 공유 횟수 증가
- `GET /api/fortune/share`: 조회수 증가

자세한 사용법은 [부동산 사주 기능 문서](docs/fortune-feature.md)를 참고하세요.

## 💡 주요 특징

- **실시간 계산**: 입력과 동시에 시나리오 생성
- **정확한 금융 계산**: 실제 금융 공식 적용
- **정책 연동**: 최신 정부 지원 정책 반영
- **사용자 친화적**: 복잡한 금융 정보를 쉽게 이해

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해 주세요.

## 🌐 커스텀 도메인 연결

배포를 Vercel에서 진행한다면 구매한 `real-e.space` 도메인을 다음 순서로 연결할 수 있습니다.

1. [Vercel Dashboard](https://vercel.com/)에서 해당 프로젝트를 연 뒤 **Settings → Domains**로 이동합니다.
2. **Add Domain** 버튼을 눌러 `real-e.space`를 입력하면, 필요한 DNS 레코드 정보가 안내됩니다.
3. 도메인을 구매한 곳(예: 가비아, Cloudflare 등)의 DNS 설정에 안내된 A 레코드 혹은 CNAME 레코드를 추가합니다. Cloudflare 사용 시 프록시(주황색 구름)를 끄는 것이 좋습니다.
4. DNS 전파가 끝나면 Vercel 설정 화면에서 “Valid Configuration” 메시지를 확인할 수 있고, HTTPS 인증서도 자동으로 발급됩니다.
5. `www.real-e.space` 등 서브도메인을 사용한다면 동일하게 추가합니다.

Vercel 대신 다른 인프라를 사용한다면 기본적으로 다음과 같이 설정합니다.

| 레코드 | 값 |
| --- | --- |
| A | Vercel에서 제공하는 IPv4 (`76.76.21.21` 등) |
| CNAME (`www`) | 프로젝트의 `cname.vercel-dns.com` |

DNS 수정 후에도 HTTPS가 적용되지 않으면 Vercel의 Domain Settings에서 다시 검증(Refresh)을 실행하거나, 다른 호스팅을 사용하는 경우 ACME 인증서 설정을 별도로 진행해 주세요.