// app/api/fortune/search/route.ts
// 부동산 검색 API (카카오 로컬 API 사용 - 실제 주소 검색)

import { NextRequest, NextResponse } from "next/server";

interface KakaoPlace {
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
  category_group_name: string;
  x: string; // longitude
  y: string; // latitude
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: '검색어가 필요합니다.' },
        { status: 400 }
      );
    }

    // 최소 2글자 이상 검색어만 허용
    if (query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        query: query,
        count: 0,
        results: [],
        note: '최소 2글자 이상 입력해주세요.',
      });
    }

    // 서버에서는 REST API 키 사용
    const kakaoKey = process.env.KAKAO_REST_API_KEY || '87b25472256591bf261ad27344534ff5';
    
    console.log('🔍 카카오 로컬 API 검색 시작:', query);

    const results: any[] = [];
    
    // 건물 타입 추출 함수
    const extractBuildingType = (categoryName: string, placeName: string): string => {
      if (categoryName.includes('아파트') || placeName.includes('아파트')) return '아파트';
      if (categoryName.includes('오피스텔') || placeName.includes('오피스텔')) return '오피스텔';
      if (categoryName.includes('빌라') || placeName.includes('빌라')) return '빌라';
      if (categoryName.includes('주택') || placeName.includes('주택')) return '주택';
      if (categoryName.includes('상가') || placeName.includes('상가')) return '상가';
      if (categoryName.includes('건물') || placeName.includes('빌딩')) return '건물';
      if (categoryName.includes('부동산')) return '부동산';
      return '건물'; // 기본값
    };

    // 1. 키워드 검색 (모든 건물 타입)
    try {
      const keywordUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15`;
      
      const keywordResponse = await fetch(keywordUrl, {
        headers: {
          'Authorization': `KakaoAK ${kakaoKey}`
        }
      });

      if (keywordResponse.ok) {
        const keywordData = await keywordResponse.json();
        const documents: KakaoPlace[] = keywordData.documents || [];
        
        console.log(`✅ 키워드 검색: ${documents.length}개 발견`);

        // 건물 관련 결과만 필터링
        const buildingKeywords = ['아파트', '오피스텔', '빌라', '주택', '상가', '빌딩', '단지', '타운', '캐슬', '파크', '그린빌', '푸르지오', '래미안', '힐스테이트', '자이', 'e편한세상'];
        
        documents.slice(0, 15).forEach((doc, idx) => {
          if (doc.place_name && doc.address_name) {
            // 건물 관련 장소인지 확인
            const isBuildingRelated = buildingKeywords.some(keyword => 
              doc.place_name.includes(keyword) || 
              doc.category_name?.includes(keyword) ||
              query.includes(keyword)
            );

            if (isBuildingRelated || results.length < 5) { // 최소 5개는 보여주기
              const buildingType = extractBuildingType(doc.category_name || '', doc.place_name);
              
              results.push({
                id: `kakao-keyword-${idx}-${Date.now()}`,
                name: doc.place_name,
                type: buildingType,
                address: doc.road_address_name || doc.address_name,
                price: undefined,
                realAddress: true,
              });
            }
          }
        });
      }
    } catch (err) {
      console.warn('키워드 검색 실패:', err);
    }

    // 2. 주소 검색
    try {
      const addressUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=10`;
      
      const addressResponse = await fetch(addressUrl, {
        headers: {
          'Authorization': `KakaoAK ${kakaoKey}`
        }
      });

      if (addressResponse.ok) {
        const addressData = await addressResponse.json();
        const documents = addressData.documents || [];
        
        console.log(`✅ 주소 검색: ${documents.length}개 발견`);

        // 주소 기반 지역 옵션 추가
        if (documents.length > 0) {
          const firstDoc = documents[0];
          const addressName = firstDoc.address_name || firstDoc.road_address?.address_name;
          
          if (addressName && !results.some(r => r.address === addressName)) {
            results.push({
              id: `kakao-address-${Date.now()}`,
              name: `${addressName} 지역`,
              type: '지역',
              address: addressName,
              price: undefined,
            });
          }
        }
      }
    } catch (err) {
      console.warn('주소 검색 실패:', err);
    }

    // 3. 결과가 없으면 빈 배열 반환 (fallback 제거)
    if (results.length === 0) {
      console.log('⚠️ 검색 결과 없음');
    }

    // 4. 중복 제거 (같은 이름의 결과)
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex((r) => r.name === result.name)
    );

    console.log(`📊 최종 결과: ${uniqueResults.length}개`);

    // 실거래가 API는 임시 비활성화 (TLS 인증서 문제)
    // const resultsWithPrice = await enrichWithRealPrice(uniqueResults);
    
    return NextResponse.json({
      success: true,
      query: query,
      count: uniqueResults.length,
      results: uniqueResults,
      note: '실거래가는 API 승인 후 제공됩니다.',
    });

  } catch (error) {
    console.error('❌ 검색 API 에러:', error);
    return NextResponse.json(
      {
        error: '검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 예측가 생성 함수 제거 - 실거래가만 사용

// 국토교통부 실거래가 API로 실제 가격 조회
async function enrichWithRealPrice(results: any[]): Promise<any[]> {
  const apiKey = process.env.MOLIT_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.warn('⚠️ 국토교통부 API 키가 없어서 예측 가격을 사용합니다.');
    return results;
  }

  // 각 결과에 대해 실거래가 조회 시도
  const enrichedResults = await Promise.all(
    results.map(async (result) => {
      // 주소에서 시군구 코드 추출
      const sigunguCode = extractSigunguCode(result.address);
      
      if (!sigunguCode) {
        console.warn(`⚠️ 시군구 코드를 찾을 수 없음: ${result.address}`);
        return result;
      }

      try {
        // 실거래가 조회
        const realPrice = await fetchRealTransactionPrice(sigunguCode, result.name);
        
        if (realPrice) {
          console.log(`✅ 실거래가 발견: ${result.name} - ${realPrice}`);
          return {
            ...result,
            price: realPrice,
            priceSource: 'real', // 실거래가
          };
        }
      } catch (err) {
        console.warn(`⚠️ 실거래가 조회 실패: ${result.name}`, err);
      }

      // 실거래가 없으면 가격 정보 없음
      return {
        ...result,
        price: result.price || '가격 정보 없음',
        priceSource: undefined,
      };
    })
  );

  return enrichedResults;
}

// 주소에서 시군구 코드 추출
function extractSigunguCode(address: string): string | null {
  for (const [name, code] of Object.entries(SIGUNGU_CODES)) {
    if (address.includes(name)) {
      return code;
    }
  }
  return null;
}

// 실거래가 조회
async function fetchRealTransactionPrice(sigunguCode: string, aptName: string): Promise<string | null> {
  try {
    const apiKey = process.env.MOLIT_API_KEY;
    if (!apiKey) return null;

    // 현재 년월 및 이전 달 (데이터는 1-2개월 지연됨)
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const yearForPrevMonth = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const dealYmd = `${yearForPrevMonth}${String(prevMonth).padStart(2, '0')}`;

    // 공공데이터포털 API - 아파트매매 실거래자료
    const apiUrl = `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev`;
    const url = new URL(apiUrl);
    url.searchParams.append('serviceKey', apiKey);
    url.searchParams.append('LAWD_CD', sigunguCode);
    url.searchParams.append('DEAL_YMD', dealYmd);
    url.searchParams.append('numOfRows', '100');
    url.searchParams.append('pageNo', '1');

    console.log(`🏢 공공데이터포털 API 호출:`);
    console.log(`   - 지역코드: ${sigunguCode}`);
    console.log(`   - 거래년월: ${dealYmd}`);
    console.log(`   - 아파트명: ${aptName}`);
    console.log(`   - Full URL: ${url.toString()}`);

    // TLS 인증서 검증 우회 (공공데이터 API 인증서 문제)
    const https = require('https');
    const agent = new https.Agent({  
      rejectUnauthorized: false
    });
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, application/json',
      },
      // @ts-ignore
      agent: agent,
    });

    if (!response.ok) {
      console.error(`❌ 실거래가 API HTTP 오류: ${response.status}`);
      return null;
    }

    const xmlText = await response.text();
    
    // API 응답 로깅
    console.log(`📄 XML 응답 (처음 500자):`, xmlText.substring(0, 500));
    
    // 에러 체크
    if (xmlText.includes('<errMsg>') || xmlText.includes('SERVICE_KEY_IS_NOT_REGISTERED')) {
      const errMsg = xmlText.match(/<errMsg>([^<]+)<\/errMsg>/);
      console.error('❌ API 오류:', errMsg?.[1] || 'Unknown error');
      return null;
    }
    
    // 총 개수 확인
    const totalCountMatch = xmlText.match(/<totalCount>(\d+)<\/totalCount>/);
    if (totalCountMatch) {
      console.log(`📊 총 ${totalCountMatch[1]}건의 거래 데이터`);
    }
    
    // 아파트명 정리
    const aptNameClean = aptName
      .replace(/아파트|APT|단지|\d+동|\d+차/gi, '')
      .replace(/\s+/g, '')
      .trim();
    
    console.log(`🔎 검색할 아파트명: "${aptNameClean}"`);
    
    // XML에서 item 추출
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let foundCount = 0;
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      
      const getTagValue = (tag: string): string => {
        const regex = new RegExp(`<${tag}>([^<]*)<\/${tag}>`);
        const m = itemXml.match(regex);
        return m ? m[1].trim() : '';
      };
      
      const xmlAptName = getTagValue('아파트').replace(/\s+/g, '');
      const dealAmount = getTagValue('거래금액').replace(/,/g, '').replace(/\s+/g, '');
      
      foundCount++;
      
      // 아파트명 매칭
      if (xmlAptName && (xmlAptName.includes(aptNameClean) || aptNameClean.includes(xmlAptName))) {
        const priceNum = parseInt(dealAmount);
        
        if (priceNum > 0) {
          // 만원 단위를 억원 단위로 변환
          const eok = Math.floor(priceNum / 10000);
          const cheonman = Math.floor((priceNum % 10000) / 1000);
          
          console.log(`✅ 실거래가 발견! ${xmlAptName} = ${priceNum}만원 → ${eok}억 ${cheonman}천만원`);
          return `${eok}억${cheonman > 0 ? ` ${cheonman}천만원` : ''}`;
        }
      }
    }

    console.log(`⚠️ ${foundCount}개 거래 중 "${aptNameClean}" 매칭 실패`);
    return null;
  } catch (error) {
    console.error('❌ 실거래가 조회 중 오류:', error);
    return null;
  }
}

// 시군구 코드 매핑 (국토교통부 법정동 코드)
const SIGUNGU_CODES: Record<string, string> = {
  // 서울
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
  
  // 경기
  '수원시 장안구': '41111',
  '수원시 권선구': '41113',
  '수원시 팔달구': '41115',
  '수원시 영통구': '41117',
  '성남시 수정구': '41131',
  '성남시 중원구': '41133',
  '성남시 분당구': '41135',
  '안양시 만안구': '41171',
  '안양시 동안구': '41173',
  '부천시': '41190',
  '광명시': '41210',
  '평택시': '41220',
  '안산시 단원구': '41271',
  '안산시 상록구': '41273',
  '고양시 덕양구': '41281',
  '고양시 일산동구': '41285',
  '고양시 일산서구': '41287',
  '과천시': '41290',
  '구리시': '41310',
  '남양주시': '41360',
  '용인시 처인구': '41461',
  '용인시 기흥구': '41463',
  '용인시 수지구': '41465',
  '화성시': '41590',
  
  // 인천
  '인천 중구': '28110',
  '인천 동구': '28140',
  '인천 미추홀구': '28177',
  '인천 연수구': '28185',
  '인천 남동구': '28200',
  '인천 부평구': '28237',
  '인천 계양구': '28245',
  '인천 서구': '28260',
};

