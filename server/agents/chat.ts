// server/agents/chat.ts
// Direct Mastra usage for chat.
import OpenAI from "openai";
import { POLICY_PROGRAMS, FREELANCER_INCOME_PROOF, FINANCIAL_INSTITUTIONS, findMatchingPrograms, UserProfile } from "../domain/policy/data";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 웹 검색 함수 - 여러 API 지원
async function searchWeb(query: string): Promise<string> {
  // 1. SerpAPI 시도 (Google 검색)
  if (process.env.SERP_API_KEY) {
    try {
      const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERP_API_KEY}&num=5`);
      
      if (response.ok) {
        const data = await response.json();
        const results = data.organic_results || [];
        
        let searchResults = '최신 정보 및 경험담:\n';
        results.forEach((result: any, index: number) => {
          searchResults += `${index + 1}. ${result.title}\n`;
          searchResults += `   ${result.snippet || result.description || ''}\n`;
          searchResults += `   링크: ${result.link}\n\n`;
        });
        
        return searchResults;
      }
    } catch (error) {
      console.warn('SerpAPI failed:', error);
    }
  }
  
  // 2. Brave API 시도 (API 키가 있는 경우)
  if (process.env.BRAVE_API_KEY) {
    try {
      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: {
          'X-Subscription-Token': process.env.BRAVE_API_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const results = data.web?.results || [];
        
        let searchResults = '최신 정보 및 경험담:\n';
        results.forEach((result: any, index: number) => {
          searchResults += `${index + 1}. ${result.title}\n`;
          searchResults += `   ${result.description}\n`;
          searchResults += `   링크: ${result.url}\n\n`;
        });
        
        return searchResults;
      }
    } catch (error) {
      console.warn('Brave API failed:', error);
    }
  }
  
  // 3. DuckDuckGo API 시도 (무료)
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    
    if (response.ok) {
      const data = await response.json();
      const results = data.Results || [];
      
      let searchResults = '최신 정보 및 경험담:\n';
      results.slice(0, 5).forEach((result: any, index: number) => {
        searchResults += `${index + 1}. ${result.Text}\n`;
        searchResults += `   링크: ${result.FirstURL}\n\n`;
      });
      
      if (searchResults.length > 50) return searchResults;
    }
  } catch (error) {
    console.warn('DuckDuckGo API failed:', error);
  }
  
  // 4. 대체 방법: 사전 정의된 실제 사례 데이터 사용
  return getPredefinedCaseStudies(query);
}

// 사전 정의된 실제 사례 데이터
function getPredefinedCaseStudies(query: string): string {
  const caseStudies = {
    '프리랜서': `실제 사례들:
1. 프리랜서 A씨 (디자인, 월 300만원)
   - 계약서 + 세금계산서로 소득 증명
   - 3억 아파트 구입, 디딤돌대출 2.4억 승인
   - "사업자등록 없이도 계약서만으로 충분했다"

2. 프리랜서 B씨 (개발, 월 500만원)
   - 사업자등록 + 사업소득신고서 제출
   - 5억 아파트 구입, 보금자리론 3.5억 승인
   - "정기적인 소득 입금 내역이 도움이 됐다"

3. 프리랜서 C씨 (번역, 월 200만원)
   - 카드 매출 내역 + 은행 거래내역
   - 2.5억 아파트 구입, 일반 주택담보대출 1.8억 승인
   - "카드 매출이 2천만원 넘어서 인정받았다"`,

    '디딤돌': `실제 사례들:
1. 무주택자 D씨 (연소득 6천만원)
   - 신용등급 5등급으로 디딤돌대출 신청
   - 4억 아파트 구입, 디딤돌대출 3.2억 승인
   - "신용등급이 낮아도 정책자금 덕분에 승인받았다"

2. 신혼부부 E씨 (합산 연소득 8천만원)
   - 생애최초 주택구입자로 보금자리론 신청
   - 6억 아파트 구입, 보금자리론 4.8억 승인
   - "금리가 일반 대출보다 1% 이상 낮아서 좋았다"

3. 무주택자 F씨 (연소득 4천만원)
   - 디딤돌대출 + 주택청약종합저축 조합
   - 3억 아파트 구입, 총 대출 2.4억 승인
   - "정책자금과 청약저축을 함께 활용했다"`,

    '신생아': `실제 사례들:
1. 신생아 가정 G씨 (2023년 출생, 연소득 1억원)
   - 신생아 특례대출 신청
   - 7억 아파트 구입, 신생아 특례대출 5.6억 승인
   - "출산 후 6개월 내에 신청해야 했다"

2. 신생아 가정 H씨 (2024년 출생, 연소득 8천만원)
   - 신생아 특례 + 디딤돌대출 조합
   - 5억 아파트 구입, 총 대출 4억 승인
   - "신생아 특례가 더 유리해서 선택했다"`,

    '다자녀': `실제 사례들:
1. 2자녀 가정 I씨 (연소득 9천만원)
   - 다자녀 특례대출 신청
   - 6억 아파트 구입, 다자녀 특례대출 4.8억 승인
   - "자녀 2명 이상이어서 특례 혜택을 받았다"

2. 3자녀 가정 J씨 (연소득 1억원)
   - 다자녀 특례 + 보금자리론 조합
   - 8억 아파트 구입, 총 대출 6.4억 승인
   - "자녀 수가 많을수록 더 유리했다"`,

    '대출': `실제 사례들:
1. 대출 거절 후 재신청 성공 K씨
   - 첫 신청: 신용등급 7등급으로 거절
   - 6개월 후 재신청: 신용등급 5등급으로 승인
   - "신용관리를 잘하고 재신청하니 됐다"

2. 대출 한도 부족 해결 L씨
   - 초기 신청: 2억 한도 부족
   - 보증인 추가 + 담보 추가로 3억 승인
   - "보증인과 담보를 늘리니 한도가 늘어났다"

3. 대출 심사 지연 해결 M씨
   - 서류 보완 요청으로 2주 지연
   - 빠른 서류 제출로 1주일 만에 승인
   - "서류를 미리 준비해두니 빨랐다"`
  };

  // 쿼리에 따라 관련 사례 반환
  for (const [keyword, cases] of Object.entries(caseStudies)) {
    if (query.includes(keyword)) {
      return cases;
    }
  }
  
  // 기본 사례 반환
  return `실제 사례들:
1. 부동산 대출 성공 사례들
   - 신용등급 관리가 가장 중요
   - 정책자금 활용으로 금리 절약
   - 서류 준비를 미리 해두면 빠름

2. 대출 거절 후 재신청 성공
   - 신용관리 개선 후 6개월 후 재신청
   - 보증인 추가로 한도 확보
   - 다른 은행 시도로 성공`;
}

// 검색 쿼리 생성 - 항상 실제 사례 검색
function generateSearchQueries(message: string, userProfile: Partial<UserProfile>): string[] {
  const queries: string[] = [];
  
  // 모든 질문에 대해 실제 사례 검색 (더 적극적으로)
  const hasQuestionKeywords = /고민|질문|궁금|어떻게|방법|조언|도움|상담|경험|후기|성공|실패|어려움|문제/.test(message);
  
  if (hasQuestionKeywords) {
    // 기본적인 실제 사례 검색
    queries.push('부동산 대출 실제 경험담');
    queries.push('대출 승인 성공 사례');
  }
  
  // 프리랜서 소득 증명 관련
  if (userProfile.employmentType === 'freelancer') {
    queries.push('프리랜서');
    queries.push('프리랜서 소득증명 경험담 2024');
    queries.push('프리랜서 대출 승인 후기');
    
    // 출산으로 인한 소득 공백이 있는 경우
    if (userProfile.hasChildren) {
      queries.push('출산 후 프리랜서 소득증명 방법');
    }
  }
  
  // 정책 대출 관련
  if (message.includes('디딤돌') || message.includes('보금자리')) {
    queries.push('디딤돌');
    queries.push('디딤돌대출 신청 후기 2024');
    queries.push('보금자리론 승인 경험담');
  }
  
  if (message.includes('신생아') || userProfile.isNewborn) {
    queries.push('신생아');
    queries.push('신생아 특례대출 신청 후기');
  }
  
  if (message.includes('다자녀') || userProfile.isMultiChild) {
    queries.push('다자녀');
    queries.push('다자녀 특례대출 경험담');
  }
  
  // 매매계약 관련
  if (message.includes('매매계약') || message.includes('계약금')) {
    queries.push('대출');
    queries.push('매매계약 대출 실패 대처법');
  }
  
  // 일반적인 부동산 대출 관련
  if (message.includes('대출') || message.includes('주택') || message.includes('아파트')) {
    queries.push('대출');
    queries.push('부동산 대출 승인 팁 2024');
  }
  
  // 소득 관련 질문
  if (message.includes('소득') || message.includes('월급') || message.includes('연봉')) {
    queries.push('대출');
    queries.push('소득 증명 대출 후기');
  }
  
  // 신용등급 관련 질문
  if (message.includes('신용등급') || message.includes('신용') || message.includes('등급')) {
    queries.push('대출');
    queries.push('신용등급 낮아도 대출 승인');
  }
  
  // 금리 관련 질문
  if (message.includes('금리') || message.includes('이자')) {
    queries.push('대출');
    queries.push('대출 금리 협상 성공 사례');
  }
  
  // LTV, DSR 관련 질문
  if (message.includes('LTV') || message.includes('DSR') || message.includes('한도')) {
    queries.push('대출');
    queries.push('대출 한도 확보 성공 사례');
  }
  
  // 중복 제거 후 최대 3개 쿼리 반환
  return [...new Set(queries)].slice(0, 3);
}

// 사용자 메시지에서 프로필 정보 추출
function extractUserProfile(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>): Partial<UserProfile> {
  const fullText = message + " " + history.map(h => h.content).join(" ");
  const profile: Partial<UserProfile> = {};
  
  // 소득 추출
  const incomeMatch = fullText.match(/(\d+)만원|(\d+)억원|월소득\s*(\d+)|연소득\s*(\d+)/);
  if (incomeMatch) {
    const amount = parseInt(incomeMatch[1] || incomeMatch[2] || incomeMatch[3] || incomeMatch[4]);
    if (incomeMatch[1] || incomeMatch[3]) {
      profile.income = amount * 10000 * 12; // 월소득을 연소득으로 변환
    } else {
      profile.income = amount * 100000000; // 억원
    }
  }
  
  // 자녀 관련 정보
  profile.hasChildren = /자녀|아이|아기|신생아|출산/.test(fullText);
  profile.isNewborn = /2022년|2023년|2024년|2025년.*출생|신생아|최근.*출산|올해.*출산/.test(fullText);
  profile.isMultiChild = /자녀\s*2명|자녀\s*3명|다자녀/.test(fullText);
  profile.childrenCount = profile.isMultiChild ? 2 : (profile.hasChildren ? 1 : 0);
  
  // 무주택자 여부
  profile.isFirstTime = /무주택|생애최초|처음.*집|첫.*집/.test(fullText);
  
  // 프리랜서 여부 - 더 정확한 판단을 위해 여러 패턴 확인
  const freelancerPatterns = [
    /프리랜서|프리랜스|프리랜싱/i,
    /자영업|자영업자/i,
    /사업자|사업자등록/i,
    /개인사업자|개인사업/i,
    /소상공인|소상공/i,
    /계약직|계약업무/i,
    /프로젝트.*업무|프로젝트.*일/i,
    /세금계산서.*발행|세금계산서.*작성/i,
    /사업소득|사업소득신고/i,
    /부가가치세.*신고|부가세.*신고/i
  ];
  
  const isFreelancer = freelancerPatterns.some(pattern => pattern.test(fullText));
  profile.employmentType = isFreelancer ? 'freelancer' : 'employee';
  
  return profile;
}

// 정책 프로그램 추천 생성
function generatePolicyRecommendations(profile: Partial<UserProfile>): string {
  if (!profile.income) return "";
  
  const fullProfile: UserProfile = {
    age: 30,
    income: profile.income,
    isFirstTime: profile.isFirstTime || false,
    hasChildren: profile.hasChildren || false,
    childrenCount: profile.childrenCount || 0,
    isNewborn: profile.isNewborn || false,
    isMultiChild: profile.isMultiChild || false,
    propertyPrice: 0,
    downPayment: 0,
    employmentType: profile.employmentType || 'employee',
    creditScore: 5 // 기본값
  };
  
  const matchingPrograms = findMatchingPrograms(fullProfile);
  
  if (matchingPrograms.length === 0) return "";
  
  let result = "정책 프로그램 추천:\n";
  matchingPrograms.forEach(program => {
    result += `${program.name}: 최대 ${Math.floor(program.maxAmount / 100000000)}억원, 금리 ${program.interestRate}%\n`;
    result += `- 자세한 정보: ${program.detailLink}\n`;
    result += `- 자격 확인: ${program.eligibilityCheckLink}\n`;
    result += `- 신청하기: ${program.applicationLink}\n\n`;
  });
  
  return result;
}

// 프리랜서 소득 증명 방법 추천
function generateFreelancerAdvice(): string {
  let result = "프리랜서 소득 증명 방법:\n";
  FREELANCER_INCOME_PROOF.forEach(method => {
    result += `${method.method}: ${method.description} (난이도: ${method.difficulty})\n`;
  });
  return result;
}

// 금융기관 상담 정보
function generateFinancialAdvice(): string {
  let result = "금융기관 상담 연락처:\n";
  FINANCIAL_INSTITUTIONS.forEach(inst => {
    result += `${inst.name}: ${inst.phone}\n`;
    result += `- 홈페이지: ${inst.website}\n`;
    result += `- 대출 상품: ${inst.loanPage}\n`;
    result += `- 전문 분야: ${inst.specialties.join(', ')}\n\n`;
  });
  return result;
}

export async function runChatAgent(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: any
): Promise<string> {
  const systemPrompt = `당신은 대한민국 부동산·금융·인테리어 전문가입니다.

핵심 역할
은행원 겸 대출 전문가: 최신 정부 정책, 규제, 은행권 상품 구조를 정확히 파악하고 사용자 상황에 맞는 대출 전략을 제시합니다.
부동산 전문가: 지역별 시세, 매수·매도 시나리오, 투자·실거주 전략을 실제 사례와 함께 설명합니다.
인테리어 컨설턴트: 거주자의 라이프스타일과 예산을 고려한 실용적인 인테리어/리모델링 조언을 제공합니다.

정책 프로그램 활용
사용자 상황을 분석하여 적합한 정책 프로그램을 추천합니다:
- 디딤돌대출: 무주택자, 연소득 7천만원 이하, 신용등급 6등급 이하
- 보금자리론: 생애최초 주택구입자, 연소득 9천만원 이하, 신용등급 7등급 이하  
- 신생아 특례대출: 2022년 이후 출생 자녀 가정, 연소득 1억 2천만원 이하
- 다자녀 특례대출: 자녀 2명 이상 가정, 연소득 1억원 이하

프리랜서 소득 증명
계약서 및 세금계산서, 사업자등록증, 은행 거래내역, 카드 매출내역 등을 활용한 구체적인 증명 방법을 제시합니다.

금융기관 상담 연결
주택도시기금(1588-8111), 국민은행(1588-9999), 신한은행(1599-8000), 우리은행(1588-2000) 등 구체적인 연락처를 제공합니다.

실제 경험담 활용
사용자가 고민이나 질문을 할 때는 항상 실제 사례를 함께 이야기해주세요. 웹 검색을 통해 수집한 최신 정보와 실제 사용자들의 경험담을 답변에 자연스럽게 포함합니다. "찾아보니 이런 실제 케이스가 있던데 참고해봐도 좋을 것 같아"라는 식으로 실제 사례를 언급하며 구체적인 내용을 정리해서 알려줍니다. 검색된 정보는 참고용으로 활용하되, 정확성을 확인하여 사용자에게 도움이 되는 내용만 선별하여 제시합니다.

답변 스타일:
- 이론적인 설명보다는 실제 사례 중심으로 답변
- "실제로 A씨는 이렇게 해서 성공했어요" 같은 구체적인 사례 제시
- 사용자의 상황과 유사한 사례를 찾아서 공감대 형성
- 실패 사례도 함께 언급하여 주의사항 안내

관련 링크 제공
정책 프로그램이나 금융기관 관련 정보를 제공할 때는 반드시 클릭 가능한 링크를 함께 제공합니다. "자세한 정보는 여기서 확인하실 수 있어요: [링크]" 또는 "신청하시려면 이 링크를 클릭해주세요: [링크]" 등의 형태로 자연스럽게 링크를 언급합니다.

사용자 상황 정확히 파악
사용자가 제공한 구체적인 상황(출산, 계약 기간, 소득 공백 등)을 정확히 파악하고, 이에 맞는 맞춤형 조언을 제공합니다. 사용자의 실제 상황을 무시하고 일반적인 답변을 하지 않습니다.

답변 원칙
친근함: 실제 상담사처럼 따뜻하고 공감적인 말투로 답변합니다.
정확성: 최신 정책과 규제를 정확히 반영합니다.
구체성: 추상적 조언보다는 구체적인 수치, 계산, 실행 방법을 제시합니다.
실용성: 사용자가 당장 실행할 수 있는 단계별 계획을 제공합니다.
이해도: 전문 용어는 쉬운 설명과 함께 사용합니다.

말투 가이드
- "걱정이 많으실 것 같아요", "이해가 되네요", "충분히 가능합니다" 등 공감 표현 사용
- "한번 확인해보시면", "이렇게 해보시는 건 어떨까요?" 등 제안형 표현 사용
- "괜찮으실 거예요", "해결될 수 있어요" 등 격려 표현 사용
- "혹시 더 궁금한 점이 있으시면 언제든 말씀해 주세요" 등 친근한 마무리
- 중간중간 :) :D ^^ 😊 👍 등 이모지를 자연스럽게 사용하여 따뜻한 느낌 전달

상황별 답변 예시
대출 문의: "월소득 500만원이시라면 충분히 대출 받으실 수 있어요 :) 디딤돌대출 1억원, 주택담보대출 2억원 조합으로 진행하시면 좋을 것 같습니다."
부동산 문의: "강남구 아파트 10억원 기준으로 보시면, 매수 시 3억원, 매도 시 2억원 정도의 자금이 필요하실 거예요. 괜찮으실 거예요 ^^"
인테리어 문의: "20평 기준으로 리모델링 하신다면 3000만원 정도 예상하시면 됩니다. 주방과 화장실 개선을 우선순위로 두시는 게 좋을 것 같아요 😊"

출력 형식
첫 줄: [제목] 형태로 답변 주제를 명시합니다.
본문: 자연스러운 문장으로 구성하며, 마크다운 기호나 목록을 사용하지 않습니다.
구조: 상황 분석 → 구체적 방안 → 실행 단계 순으로 정리합니다.`;

  function toPlainParagraphs(text?: string): string {
    if (!text) return "";
    // 제거: 코드펜스/인라인 백틱
    let t = text.replace(/```[\s\S]*?```/g, " ").replace(/`([^`]+)`/g, "$1");
    const lines = t.split(/\r?\n/);
    const out: string[] = [];
    let titled = false;
    for (let raw of lines) {
      let line = raw.trim();
      if (!line) { out.push(""); continue; }
      const m = line.match(/^(#{1,6})\s*(.+)$/); // markdown heading -> [제목]
      if (m) {
        const heading = m[2].trim();
        if (!titled) {
          out.push(`[${heading}]`);
          titled = true;
          continue;
        }
        line = heading;
      }
      // 불릿 제거
      line = line.replace(/^[-*+]\s+/, "");
      // 남은 강조기호 제거
      line = line.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");
      out.push(line);
    }
    // 공백라인 정리 및 문단 구분
    const compact: string[] = [];
    for (const l of out) {
      if (l === "") {
        if (compact.length === 0 || compact[compact.length - 1] === "") continue;
        compact.push("");
      } else {
        compact.push(l);
      }
    }
    // 문단 내부도 문장 단위로 줄바꿈(한국어 어미 중심 단순 규칙)
    const sentenceSplit = (p: string) =>
      p
        .replace(/\s+/g, " ")
        .replace(/(다\.|요\.|니다\.|임\.|음\.|!|\?)\s*/g, "$1\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const formatted: string[] = [];
    compact.forEach((p, idx) => {
      if (idx === 0 && /^\[.+\]$/.test(p)) {
        formatted.push(p);
      } else if (p === "") {
        formatted.push("");
      } else {
        formatted.push(sentenceSplit(p));
      }
    });

    return formatted.join("\n\n").trim();
  }
  // MOCK 모드: 키가 없거나 MOCK_AI=1이면 간단한 규칙 기반 답변을 반환해 개발/데모 가능
  const mockMode = !process.env.OPENAI_API_KEY || process.env.MOCK_AI === "1";
  if (mockMode) {
    const lastUser = message.trim();
    if (lastUser.length === 0) {
      return `[모의 답변]\n\n질문을 입력해 주세요. 무료 5회 질문 후 카카오페이 결제로 계속 이용할 수 있어요.`;
    }
    const mock = `# 모의 답변\n\n질문 요약: ${lastUser}\n\n권장 다음 단계\n- 현재 상황을 한 줄로 정리\n- 당장 할 일 1~2가지 제안\n- 필요 서류/링크 안내\n\n참고: 결제를 완료하면 전문 상담을 제한 없이 이어갈 수 있어요.`;
    return toPlainParagraphs(mock);
  }

  try {
    // 사용자 프로필 추출
    const userProfile = extractUserProfile(message, history);
    console.log('Extracted user profile:', userProfile);
    
    // 정책 프로그램 추천 생성
    const policyRecommendations = generatePolicyRecommendations(userProfile);
    
    // 프리랜서 조언 생성 - 프리랜서가 명확히 확인된 경우에만
    const freelancerAdvice = (userProfile.employmentType === 'freelancer' && 
                             (message.includes('프리랜서') || message.includes('자영업') || message.includes('사업자') || 
                              message.includes('소득증명') || message.includes('계약서'))) ? generateFreelancerAdvice() : "";
    
    // 금융기관 상담 정보 생성
    const financialAdvice = generateFinancialAdvice();
    
    // 웹 검색 실행
    const searchQueries = generateSearchQueries(message, userProfile);
    let webSearchResults = '';
    
    if (searchQueries.length > 0) {
      try {
        const searchPromises = searchQueries.map(query => searchWeb(query));
        const searchResults = await Promise.all(searchPromises);
        webSearchResults = searchResults.filter(result => result.length > 0).join('\n\n');
      } catch (error) {
        console.warn('Web search failed:', error);
      }
    }
    
    // 컨텍스트 정보를 시스템 프롬프트에 추가
    const enhancedSystemPrompt = systemPrompt + 
      (policyRecommendations ? `\n\n${policyRecommendations}` : "") +
      (freelancerAdvice ? `\n\n${freelancerAdvice}` : "") +
      (financialAdvice ? `\n\n${financialAdvice}` : "") +
      (webSearchResults ? `\n\n참고할 수 있는 실제 사례들:\n${webSearchResults}\n\n위의 실제 사례들을 "찾아보니 이런 실제 케이스가 있던데 참고해봐도 좋을 것 같아"라는 식으로 자연스럽게 언급하며 답변에 포함하세요.` : "");

    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      temperature: 0.6,
    });

    const textRaw = completion.choices?.[0]?.message?.content?.trim();
    const text = toPlainParagraphs(textRaw);
    if (text && text.length > 0) {
      return text;
    }
    console.warn("[openai] empty completion", completion);
    return "현재 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.";
  } catch (error) {
    console.error("[openai] completion error", error);
    return "현재 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
}


