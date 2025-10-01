# 부동산 사주 기능 설치 가이드

## 🚀 빠른 설정 (5분)

### 1️⃣ 데이터베이스 테이블 생성

Supabase 대시보드에서 SQL 에디터를 열고 다음 파일을 실행하세요:

```sql
-- sql/create_fortune_log_table.sql 파일 내용을 복사해서 실행
```

또는 터미널에서:

```bash
psql -U your_user -d your_database -f sql/create_fortune_log_table.sql
```

### 2️⃣ 환경 변수 확인

`.env.local` 파일에 다음 변수들이 설정되어 있는지 확인:

```env
# OpenAI API (필수)
OPENAI_API_KEY=sk-...

# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# 사이트 URL (공유 기능에 필요)
NEXT_PUBLIC_SITE_URL=https://real-e.space
```

### 3️⃣ 테스트

개발 서버를 실행하고 데모 페이지를 확인:

```bash
npm run dev
# 브라우저에서 http://localhost:3000/fortune/demo 열기
```

## 📦 프로젝트에 통합하기

### 옵션 1: 매물 카드에 버튼 추가

```tsx
import FortuneButton from "@/app/fortune/FortuneButton";

function PropertyCard({ property }) {
  return (
    <div className="property-card">
      <h3>{property.name}</h3>
      <p>{property.price}</p>
      
      {/* 사주 보기 버튼 추가 */}
      <FortuneButton
        propertyId={property.id}
        propertyName={property.name}
        propertyType={property.type}
        propertyPrice={property.price}
        propertyAddress={property.address}
      />
    </div>
  );
}
```

### 옵션 2: 매물 상세 페이지에 추가

```tsx
import FortuneButton from "@/app/fortune/FortuneButton";

export default function PropertyDetailPage({ property }) {
  return (
    <div>
      <h1>{property.name}</h1>
      {/* ... 매물 정보 ... */}
      
      <div className="property-actions">
        <button>찜하기</button>
        <button>문의하기</button>
        
        {/* 사주 보기 버튼 */}
        <FortuneButton
          propertyId={property.id}
          propertyName={property.name}
          propertyType={property.type}
          propertyPrice={property.price}
          propertyAddress={property.address}
          buttonText="이 집 사주 보기 🔮"
        />
      </div>
    </div>
  );
}
```

### 옵션 3: ChatClient 메시지에 통합

매물 정보가 포함된 메시지에 버튼을 추가하려면:

```tsx
// app/chat/ChatClient.tsx
import FortuneButton from "@/app/fortune/FortuneButton";

// 메시지 렌더링 부분에서
{messages.map((m, i) => (
  <div key={i} className="chat-message">
    <p>{m.content}</p>
    
    {/* 매물 정보가 있는 경우 */}
    {m.propertyData && (
      <FortuneButton
        propertyId={m.propertyData.id}
        propertyName={m.propertyData.name}
        propertyType={m.propertyData.type}
        propertyPrice={m.propertyData.price}
        propertyAddress={m.propertyData.address}
        buttonClassName="chat-fortune-button"
      />
    )}
  </div>
))}
```

## 🎨 스타일 커스터마이징

### 버튼 스타일 변경

```tsx
<FortuneButton
  {...props}
  buttonClassName="my-custom-button"
/>
```

```css
/* styles.css */
.my-custom-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.my-custom-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}
```

### 모달 스타일 오버라이드

`app/fortune/fortune.css` 파일을 수정하거나, 새로운 CSS 파일을 만들어 import하세요.

## 🔧 고급 설정

### 카카오톡 공유 설정

카카오톡 공유 기능을 사용하려면 Kakao SDK를 추가하세요:

1. [Kakao Developers](https://developers.kakao.com/)에서 앱 등록
2. JavaScript 키 발급
3. `app/layout.tsx`에 SDK 추가:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
          integrity="sha384-l+xbElFSnPZ2rOaPrU//2FF5B4LB8FiX5q4fXYTlfcG4PGpMkE1vcL7kNXI6Cci0"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && window.Kakao) {
                window.Kakao.init('YOUR_KAKAO_JAVASCRIPT_KEY');
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 이미지 영구 저장

DALL-E 이미지는 일시적이므로 영구 저장소에 업로드하는 것을 권장합니다:

```typescript
// app/api/fortune/image/route.ts 수정
import { uploadToS3 } from "@/lib/s3";

// DALL-E 이미지 생성 후
const imageUrl = response.data[0]?.url;

// S3에 업로드
const permanentUrl = await uploadToS3(imageUrl, `fortune/${fortuneId}.png`);

// DB에 permanentUrl 저장
```

### Rate Limiting 추가

API 남용을 방지하기 위해 rate limiting을 추가하세요:

```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"), // 시간당 5회
});

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/fortune")) {
    const ip = request.ip ?? "127.0.0.1";
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
      return new Response("Too Many Requests", { status: 429 });
    }
  }
  
  return NextResponse.next();
}
```

## 📊 Analytics 추가

### Google Analytics 이벤트 추적

```tsx
// app/fortune/FortuneModal.tsx
const handleGenerate = async () => {
  // ... 운세 생성 로직 ...
  
  // GA 이벤트 전송
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "fortune_generated", {
      property_id: propertyId,
      property_name: propertyName,
    });
  }
};

const handleShare = async (platform: string) => {
  // ... 공유 로직 ...
  
  // GA 이벤트 전송
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "fortune_shared", {
      platform: platform,
      property_id: propertyId,
    });
  }
};
```

## 🐛 문제 해결

### "Missing Supabase credentials" 오류

환경 변수가 제대로 설정되었는지 확인:
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 이미지 생성 실패

DALL-E API 할당량을 확인하세요. 실패 시 placeholder 이미지가 표시됩니다.

### 모달이 표시되지 않음

CSS 파일이 import되었는지 확인:
```tsx
import "@/app/fortune/fortune.css";
```

## 📞 지원

문제가 계속되면:
- [GitHub Issues](https://github.com/your-repo/issues)
- Email: 2025reale@gmail.com

## ✅ 체크리스트

MVP 배포 전 확인사항:

- [ ] DB 테이블 생성 완료
- [ ] 환경 변수 설정 완료
- [ ] 데모 페이지 테스트 완료
- [ ] 버튼 스타일 커스터마이징
- [ ] 공유 기능 테스트 (카카오톡, 트위터, 링크 복사)
- [ ] OG 태그 확인 (공유 시 썸네일 표시)
- [ ] 모바일 반응형 테스트
- [ ] Rate limiting 설정 (선택)
- [ ] Analytics 설정 (선택)

---

**모든 준비가 완료되었습니다! 🎉**

데모 페이지를 방문해서 기능을 테스트해보세요:
👉 `http://localhost:3000/fortune/demo`

