// app/api/fortune/realprice/route.ts
// 국토교통부 실거래가 API 조회

import { NextRequest, NextResponse } from "next/server";

interface ApartmentTransaction {
  aptNm: string; // 아파트명
  dealAmount: string; // 거래금액
  buildYear: string; // 건축연도
  dealYear: string; // 거래연도
  dealMonth: string; // 거래월
  dealDay: string; // 거래일
  excuseArea: string; // 전용면적
  floor: string; // 층
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sigunguCode = searchParams.get('sigungu'); // 시군구코드
    const aptName = searchParams.get('apt'); // 아파트명

    // 실거래가 API 키 (data.go.kr에서 발급)
    const apiKey = process.env.MOLIT_API_KEY || 'YOUR_API_KEY_HERE';
    
    if (!sigunguCode) {
      return NextResponse.json(
        { error: '시군구 코드가 필요합니다.' },
        { status: 400 }
      );
    }

    // 현재 년월
    const now = new Date();
    const dealYmd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 국토교통부 아파트매매 실거래가 API
    const apiUrl = `http://openapi.molit.go.kr:8081/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptTrade`;
    const url = new URL(apiUrl);
    url.searchParams.append('serviceKey', apiKey);
    url.searchParams.append('LAWD_CD', sigunguCode);
    url.searchParams.append('DEAL_YMD', dealYmd);
    url.searchParams.append('numOfRows', '100');

    console.log('🏢 국토교통부 실거래가 API 호출:', sigunguCode, dealYmd);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log('📄 API 응답 (처음 500자):', xmlText.substring(0, 500));

    // XML 파싱 (간단한 정규식 사용)
    const items = parseApartmentXML(xmlText);
    
    // 아파트명으로 필터링
    let filteredItems = items;
    if (aptName) {
      filteredItems = items.filter(item => 
        item.aptNm.includes(aptName) || aptName.includes(item.aptNm)
      );
    }

    // 최근 거래 데이터만
    const recentTransactions = filteredItems.slice(0, 10);

    console.log(`✅ 실거래가 ${recentTransactions.length}건 발견`);

    return NextResponse.json({
      success: true,
      count: recentTransactions.length,
      transactions: recentTransactions,
    });

  } catch (error) {
    console.error('❌ 실거래가 API 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: '실거래가 데이터를 가져올 수 없습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 간단한 XML 파싱 함수
function parseApartmentXML(xml: string): ApartmentTransaction[] {
  const items: ApartmentTransaction[] = [];
  
  // <item> 태그들을 찾아서 파싱
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const getTagValue = (tag: string): string => {
      const regex = new RegExp(`<${tag}>([^<]*)<\/${tag}>`);
      const m = itemXml.match(regex);
      return m ? m[1].trim() : '';
    };

    items.push({
      aptNm: getTagValue('아파트'),
      dealAmount: getTagValue('거래금액'),
      buildYear: getTagValue('건축년도'),
      dealYear: getTagValue('년'),
      dealMonth: getTagValue('월'),
      dealDay: getTagValue('일'),
      excuseArea: getTagValue('전용면적'),
      floor: getTagValue('층'),
    });
  }
  
  return items;
}

// 시군구 코드 매핑 (주요 지역)
export const SIGUNGU_CODES: Record<string, string> = {
  '강남구': '11680',
  '서초구': '11650',
  '송파구': '11710',
  '강동구': '11740',
  '마포구': '11440',
  '용산구': '11170',
  '성동구': '11200',
  '광진구': '11215',
  '동대문구': '11230',
  '중랑구': '11260',
  '성북구': '11290',
  '강북구': '11305',
  '도봉구': '11320',
  '노원구': '11350',
  '은평구': '11380',
  '서대문구': '11410',
  '종로구': '11110',
  '중구': '11140',
  '영등포구': '11560',
  '동작구': '11590',
  '관악구': '11620',
  '금천구': '11545',
  '구로구': '11530',
  '양천구': '11470',
  '강서구': '11500',
};

