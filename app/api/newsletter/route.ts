import { NextResponse } from 'next/server';

interface NewsletterItem {
  category: string;
  title: string;
  link?: string;
  date?: string;
  summary?: string;
  glossary?: string;
}

interface NewsletterData {
  items: NewsletterItem[];
  lastUpdated: string;
}

// Ziply 공개 API에서 뉴스 데이터 가져오기
const getNewsletterData = async (): Promise<NewsletterData> => {
  try {
    console.log('🔄 Ziply 공개 API 호출 시작');
    
             // RealE에서 Ziply API 호출
             const response = await fetch('https://ziply-nine.vercel.app/api/public/newsletter?category=all&limit=10', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RealE-Newsletter-Client/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Ziply API 호출 실패: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📡 Ziply API 응답:', result);
    
    if (result.success && result.data && result.data.newsletter && result.data.newsletter.items) {
      const items = result.data.newsletter.items.map((item: any) => ({
        category: item.category || '🏠 초보자/신혼부부',
        title: item.title || '제목 없음',
        link: item.url || 'https://ziply-nine.vercel.app/',
        date: item.publishedAt || new Date().toISOString().split('T')[0],
        summary: item.summary || '',
        glossary: item.glossary || ''
      }));
      
      console.log(`✅ Ziply API에서 ${items.length}개의 뉴스 아이템을 가져왔습니다.`);
      console.log('📋 가져온 뉴스 아이템들:', items.map(item => ({ title: item.title, category: item.category })));
      return {
        items,
        lastUpdated: new Date().toISOString()
      };
    } else {
      throw new Error('Ziply API 응답 형식이 올바르지 않습니다');
    }
  } catch (error) {
    console.error('❌ Ziply API 연결 오류:', error);
    
    // Ziply API 연결 실패 시 임시 테스트 데이터 반환
    console.log('❌ Ziply API 연결 실패, 임시 데이터 사용');
    return {
      items: [
        {
          category: "🏠 초보자/신혼부부",
          title: "청년 전세자금대출 조건 완화... 금리 1.5%로 인하",
          link: "https://ziply-nine.vercel.app/",
          date: "2025-01-02",
          summary: "정부가 청년층을 위한 전세자금대출 조건을 완화하고 금리를 1.5%로 인하했다는 소식입니다.",
          glossary: "전세자금대출: 전세보증금을 마련하기 위해 받는 대출"
        },
        {
          category: "💰 투자자",
          title: "2025년 부동산 시장 전망: 지역별 투자 포인트",
          link: "https://ziply-nine.vercel.app/",
          date: "2025-01-01",
          summary: "2025년 부동산 시장의 지역별 투자 포인트와 시장 전망을 분석한 내용입니다.",
          glossary: "투자 포인트: 투자할 때 주목해야 할 핵심 요소"
        },
        {
          category: "📊 시장동향",
          title: "전국 아파트 매매가격 상승률 둔화... 전세는 여전히 상승",
          link: "https://ziply-nine.vercel.app/",
          date: "2025-01-02",
          summary: "전국 아파트 매매가격 상승률이 둔화되고 있지만, 전세 시장은 여전히 상승세를 보이고 있습니다.",
          glossary: "상승률 둔화: 가격이 오르는 속도가 느려지는 현상"
        },
        {
          category: "🏘️ 지역뉴스",
          title: "강남구 아파트 가격 0.3% 상승... 전세 수요 증가",
          link: "https://ziply-nine.vercel.app/",
          date: "2025-01-01",
          summary: "강남구 아파트 가격이 0.3% 상승했으며, 전세 수요도 함께 증가하고 있습니다.",
          glossary: "전세 수요: 전세를 원하는 사람들의 수요"
        },
        {
          category: "💡 정책분석",
          title: "정부 주거정책 변화... 청년층 지원 확대",
          link: "https://ziply-nine.vercel.app/",
          date: "2025-01-02",
          summary: "정부의 주거정책이 변화하면서 청년층에 대한 지원이 확대되고 있습니다.",
          glossary: "주거정책: 주택과 관련된 정부의 정책"
        },
        {
          category: "🏠 초보자/신혼부부",
          title: "신혼부부 전용 주택공급 확대... 우선 분양 비율 상향",
          link: "https://ziply-nine.vercel.app/",
          date: "2025-01-03",
          summary: "신혼부부를 위한 전용 주택공급이 확대되고 우선 분양 비율이 상향 조정되었습니다.",
          glossary: "우선 분양: 특정 조건을 만족하는 사람들에게 우선적으로 주택을 분양하는 제도"
        },
        {
          category: "💰 투자자",
          title: "리츠 투자 급증... 2025년 예상 수익률 8%",
          link: "https://ziply-nine.vercel.app/",
          date: "2025-01-03",
          summary: "부동산투자신탁(REITs) 투자가 급증하고 있으며, 2025년 예상 수익률이 8%에 달할 것으로 전망됩니다.",
          glossary: "리츠(REITs): 부동산투자신탁으로 여러 부동산에 투자하는 펀드"
        }
      ],
      lastUpdated: new Date().toISOString()
    };
  }
};

export async function GET() {
  try {
    const data = await getNewsletterData();
    
    // 최신 10개 뉴스 반환 (또는 실제 데이터 개수만큼)
    const recentNews = data.items.slice(0, 10);
    
    return NextResponse.json({
      success: true,
      data: {
        items: recentNews,
        lastUpdated: data.lastUpdated
      }
    });
  } catch (error) {
    console.error('뉴스레터 데이터 가져오기 실패:', error);
    
    // 에러 시 빈 배열 반환
    return NextResponse.json({
      success: false,
      data: {
        items: [],
        lastUpdated: new Date().toISOString()
      },
      error: '뉴스 데이터를 가져올 수 없습니다'
    });
  }
}