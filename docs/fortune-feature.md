# 부동산 사주/타로 콘텐츠 기능

## 📋 개요

Real-E의 부동산 사주 기능은 매물 정보를 기반으로 AI가 생성한 재미있는 운세 콘텐츠를 제공하고, 이를 SNS로 공유하여 자연스러운 바이럴 마케팅을 유도하는 기능입니다.

## 🎯 목적

- **재미 요소**: 부동산 매물에 엔터테인먼트 요소 추가
- **SNS 확산**: 공유 가능한 콘텐츠로 자연스러운 유입 증가
- **사용자 참여**: 인터랙티브한 경험 제공

## 🚀 빠른 시작

### 1. 데이터베이스 설정

```sql
-- sql/create_fortune_log_table.sql 파일 실행
psql -U your_user -d your_database -f sql/create_fortune_log_table.sql
```

또는 Supabase 콘솔에서 SQL 에디터로 직접 실행

### 2. 환경 변수 확인

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://real-e.space
```

### 3. 컴포넌트 사용

```tsx
import FortuneButton from "@/app/fortune/FortuneButton";

// 매물 카드나 상세 페이지에 추가
<FortuneButton
  propertyId="prop-001"
  propertyName="강남역 트리플 스트리트 오피스텔"
  propertyType="오피스텔"
  propertyPrice="2억 5천만원"
  propertyAddress="서울시 강남구 역삼동"
/>
```

## 📦 구현 구조

### API 엔드포인트

#### 1. `/api/fortune/generate` (POST)
운세 텍스트 생성 및 DB 저장

**Request:**
```json
{
  "propertyId": "prop-001",
  "propertyName": "강남역 오피스텔",
  "propertyType": "오피스텔",
  "propertyPrice": "2억 5천만원",
  "propertyAddress": "서울시 강남구 역삼동",
  "userName": "홍길동",
  "userBirth": "1990-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "fortuneText": "이 매물은...",
  "keywords": ["재물운 상승", "가정 화목", "길지"],
  "shareSlug": "abc12345",
  "fortuneId": "uuid..."
}
```

#### 2. `/api/fortune/image` (POST)
DALL-E 타로 카드 이미지 생성

**Request:**
```json
{
  "keywords": ["재물운 상승", "가정 화목"],
  "propertyName": "강남역 오피스텔"
}
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://..."
}
```

#### 3. `/api/fortune/share` (POST/GET)
공유 횟수 및 조회수 증가

### 프론트엔드 컴포넌트

#### `FortuneButton`
매물에 추가할 수 있는 재사용 가능한 버튼 컴포넌트

```tsx
<FortuneButton
  propertyId="prop-001"
  propertyName="강남역 오피스텔"
  propertyType="오피스텔"
  propertyPrice="2억 5천만원"
  propertyAddress="서울시 강남구 역삼동"
  buttonText="이 집 사주 보기 🔮"  // 선택사항
  buttonClassName="custom-class"     // 선택사항
/>
```

#### `FortuneModal`
사주 입력 및 결과 표시 모달 (FortuneButton이 자동으로 처리)

### 공유 페이지

`/fortune/[slug]` - 공유된 사주 결과 페이지
- OG 태그 자동 생성
- 메타 데이터 최적화
- 조회수 자동 증가

## 🎨 스타일 커스터마이징

기본 스타일은 `app/fortune/fortune.css`에 정의되어 있습니다.

커스텀 버튼 스타일 예시:
```css
.custom-fortune-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.custom-fortune-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}
```

## 📊 데이터베이스 스키마

### `fortune_log` 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | 사용자 ID (nullable) |
| `property_id` | TEXT | 매물 ID |
| `property_name` | TEXT | 매물 이름 |
| `property_type` | TEXT | 매물 종류 |
| `property_price` | TEXT | 매물 가격 |
| `user_name` | TEXT | 입력한 이름 (nullable) |
| `user_birth` | TEXT | 입력한 생년월일 (nullable) |
| `fortune_text` | TEXT | 운세 텍스트 |
| `fortune_keywords` | JSONB | 키워드 배열 |
| `image_url` | TEXT | 타로 카드 이미지 URL |
| `share_slug` | TEXT | 공유용 고유 slug |
| `view_count` | INTEGER | 조회수 |
| `share_count` | INTEGER | 공유 횟수 |
| `created_at` | TIMESTAMPTZ | 생성 시간 |
| `updated_at` | TIMESTAMPTZ | 수정 시간 |

## 🧪 테스트

데모 페이지에서 기능을 테스트할 수 있습니다:

```
http://localhost:3000/fortune/demo
```

## 🔒 보안 및 제한사항

1. **Rate Limiting**: API 호출 제한 필요 (추후 구현)
2. **이미지 저장**: DALL-E 이미지는 일시적이므로 영구 저장소에 업로드 권장
3. **사용자 인증**: 현재는 선택사항이지만, 프로덕션에서는 인증 권장

## 📈 향후 개선 사항

### Phase 2
- [ ] 사용자 입력 정보를 더 활용한 개인화
- [ ] 인기 운세 매물 랭킹 페이지
- [ ] 이미지 영구 저장소 통합 (S3, Cloudinary 등)
- [ ] 공유 링크 Analytics 통합

### Phase 3
- [ ] 자동 영상 콘텐츠 생성 (TikTok/릴스)
- [ ] SNS 자동 포스팅
- [ ] 주간 운세 다이제스트
- [ ] A/B 테스트 프레임워크

## 🎯 KPI 추적

### 데이터베이스 쿼리 예시

**일별 생성 건수:**
```sql
SELECT DATE(created_at) as date, COUNT(*) as count
FROM fortune_log
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**인기 매물 TOP 10:**
```sql
SELECT property_name, COUNT(*) as fortune_count, SUM(share_count) as total_shares
FROM fortune_log
GROUP BY property_name
ORDER BY fortune_count DESC
LIMIT 10;
```

**공유율:**
```sql
SELECT 
  COUNT(*) as total_fortunes,
  SUM(CASE WHEN share_count > 0 THEN 1 ELSE 0 END) as shared_fortunes,
  ROUND(100.0 * SUM(CASE WHEN share_count > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) as share_rate
FROM fortune_log;
```

## 🤝 기여 방법

1. 새로운 타로 카드 디자인 추가
2. GPT 프롬프트 개선
3. 공유 플랫폼 확장 (인스타그램, 페이스북 등)
4. 다국어 지원

## 📞 문의

문제나 제안 사항이 있으시면 이슈를 등록해주세요:
- GitHub Issues: [링크]
- Email: 2025reale@gmail.com

---

**면책 조항**: 본 콘텐츠는 오직 재미용으로 제공되며 실제 투자 및 매매 판단과는 무관합니다.

