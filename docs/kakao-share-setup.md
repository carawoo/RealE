# 카카오톡 공유 기능 설정 가이드

## 📱 카카오톡 공유 기능

부동산 사주 결과를 카카오톡으로 친구들에게 공유할 수 있습니다!

## 🔧 설정 방법

### 1단계: Kakao Developers 앱 등록

1. **https://developers.kakao.com/** 접속
2. **로그인** (카카오 계정)
3. **내 애플리케이션** → **애플리케이션 추가하기**
4. 앱 이름 입력: "RealE 부동산 사주"
5. 회사 이름: "뚝딱컴퍼니"

### 2단계: JavaScript 키 확인

1. 등록한 앱 선택
2. **앱 키** 탭에서 **JavaScript 키** 복사
3. 현재 사용 중인 키: `087319e261444450882a1a155abea088`

### 3단계: 플랫폼 등록

1. **플랫폼** 탭 선택
2. **Web 플랫폼 등록**
3. 사이트 도메인 추가:
   ```
   http://localhost:3000
   https://real-e.space
   ```

### 4단계: 카카오톡 공유 활성화

1. **제품 설정** → **카카오 로그인**
2. **활성화** 설정
3. **Redirect URI** 설정 (선택사항)

## ✅ 현재 설정 상태

### 환경 변수
```env
NEXT_PUBLIC_KAKAO_MAP_KEY=087319e261444450882a1a155abea088
```

### SDK 초기화
`app/layout.tsx`에 Kakao SDK 스크립트 추가됨:
```html
<script 
  src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
  integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK/vJfhJKpGKY3KNIIRxRAW1"
  crossOrigin="anonymous"
  async
/>
```

### 초기화 코드
`app/lib/kakaoInit.ts`에서 자동 초기화됨

## 🎯 사용 방법

### 사용자 입장

1. 부동산 사주 생성
2. 결과 화면에서 **"💬 카카오톡"** 버튼 클릭
3. 카카오톡 공유 창 열림
4. 친구 선택 → 전송

### 공유 메시지 구성

**제목:** 🔮 [매물명]의 부동산 사주

**설명:** 
```
[키워드1] · [키워드2] · [키워드3]

리얼이(RealE)가 AI로 분석한 이 매물의 운세를 확인해보세요!
```

**이미지:** DALL-E 생성 타로 카드 or RealE 로고

**버튼:** "사주 보러가기"

## 🐛 문제 해결

### "Kakao is not defined" 오류

**원인:** SDK가 아직 로드되지 않음

**해결:**
1. 브라우저 새로고침
2. 개발자 도구 콘솔에서 `window.Kakao` 확인
3. SDK 로드 대기 (1초)

### "앱 키가 유효하지 않습니다" 오류

**원인:** JavaScript 키가 잘못되었거나 도메인 미등록

**해결:**
1. Kakao Developers → 앱 키 확인
2. 플랫폼 설정에서 도메인 등록 확인
   - `http://localhost:3000`
   - `https://real-e.space`

### "이미지를 불러올 수 없습니다" 오류

**원인:** 이미지 URL이 HTTPS가 아니거나 CORS 문제

**해결:**
1. DALL-E 이미지는 HTTPS이므로 문제 없음
2. 이미지 로드 실패 시 RealE 로고 사용
3. 이미지 영구 저장소 사용 권장 (S3/Cloudinary)

## 📊 테스트 방법

### 로컬 테스트

1. **http://localhost:3000/fortune/search** 접속
2. 지역 검색 후 사주 생성
3. **카카오톡** 버튼 클릭
4. 카카오톡 앱 또는 웹에서 확인

### 프로덕션 테스트

1. 실제 도메인에서 테스트
2. 모바일에서 카카오톡 앱으로 공유
3. 친구가 링크 클릭 시 정상 작동 확인

## 🎨 커스터마이징

### 공유 메시지 수정

`app/fortune/FortuneModal.tsx`의 `handleShare` 함수:

```typescript
window.Kakao.Share.sendDefault({
  objectType: "feed",
  content: {
    title: "원하는 제목",
    description: "원하는 설명",
    imageUrl: "이미지 URL",
    link: {
      mobileWebUrl: shareUrl,
      webUrl: shareUrl,
    },
  },
  buttons: [
    {
      title: "버튼 텍스트",
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
  ],
});
```

### 다른 템플릿 사용

카카오는 여러 템플릿 제공:
- `feed` (현재 사용 중)
- `list`
- `location`
- `commerce`
- `text`

자세한 내용: https://developers.kakao.com/docs/latest/ko/message/js-link

## 🔒 보안 설정

### JavaScript 키 보호

- JavaScript 키는 클라이언트에 노출되므로 공개 가능
- 도메인 제한으로 보안 유지
- 서비스 사용량 모니터링

### 도메인 화이트리스트

Kakao Developers에서 허용할 도메인만 등록:
```
http://localhost:3000     (개발용)
https://real-e.space      (프로덕션)
```

## 📈 분석 및 추적

### 공유 횟수 추적

DB에 자동으로 저장됨:
```sql
SELECT COUNT(*) as share_count
FROM fortune_log
WHERE share_count > 0;
```

### 인기 공유 매물

```sql
SELECT property_name, SUM(share_count) as total_shares
FROM fortune_log
GROUP BY property_name
ORDER BY total_shares DESC
LIMIT 10;
```

## 💡 Pro Tips

1. **이미지 최적화**
   - DALL-E 이미지를 S3에 영구 저장
   - 공유 속도 향상 및 비용 절감

2. **A/B 테스트**
   - 다양한 공유 메시지 테스트
   - 클릭률 높은 문구 찾기

3. **해시태그 활용**
   - #부동산사주
   - #realespace
   - #부동산운세

## 🎉 완료!

카카오톡 공유 기능이 완전히 구현되었습니다!

**테스트 순서:**
1. 페이지 새로고침 (Kakao SDK 로드)
2. 사주 생성
3. 카카오톡 버튼 클릭
4. 공유 성공! 🎊

---

문제가 발생하면 브라우저 콘솔을 확인하세요:
- `✅ Kakao SDK 초기화 완료` - 정상
- `❌ Kakao SDK 초기화 실패` - 문제 있음

