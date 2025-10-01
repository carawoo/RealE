// server/domain/realestate/property-search.ts
// 부동산 매물 검색 API 연동

export interface Property {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  price?: number;
  areaSize?: number;
  type: 'apartment' | 'officetel' | 'house';
  tradeType?: 'sale' | 'rent';
}

// 한국부동산원 R-ONE API로 실거래가 데이터 검색
export async function searchPropertiesWithREB(region: string): Promise<Property[]> {
  try {
    const apiKey = 'c6f4cd2862dc42749698e4eeab11b059';
    const REB_API_BASE = 'https://www.reb.or.kr/r-one/openapi';
    
    // 실거래가 데이터 조회 (예: 아파트 매매 실거래가)
    // STATBL_ID는 실제 API 문서에서 확인한 통계표 ID 사용
    const url = new URL(`${REB_API_BASE}/SttsApiTblData.do`);
    url.searchParams.append('KEY', apiKey);
    url.searchParams.append('Type', 'json');
    url.searchParams.append('STATBL_ID', 'A_2024_00188'); // (월) 지역별 매매 평균가격_아파트
    url.searchParams.append('pIndex', '1');
    url.searchParams.append('pSize', '50');
    
    console.log('[REB API] 요청 URL:', url.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('R-ONE API 오류:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('[REB API] 응답:', JSON.stringify(data).substring(0, 500));
    
    // R-ONE API 응답 파싱 및 Property 형식으로 변환
    // 실제 데이터 구조에 맞게 파싱 필요
    const properties: Property[] = [];
    
    // TODO: R-ONE API 응답 구조에 맞게 파싱
    // 현재는 카카오 API로 대체
    
    return properties;
  } catch (error) {
    console.error('R-ONE API 오류:', error);
    return [];
  }
}

// 카카오 로컬 API로 부동산 검색 (무료)
export async function searchPropertiesWithKakao(region: string): Promise<Property[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '087319e261444450882a1a155abea088';
    
    // 카카오 로컬 API - 키워드로 장소 검색
    const query = `${region} 아파트`;
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `KakaoAK ${apiKey}`
      }
    });
    
    if (!response.ok) {
      console.error('카카오 로컬 API 오류:', response.status);
      return [];
    }
    
    const data = await response.json();
    const documents = data.documents || [];
    
    const properties: Property[] = documents.map((doc: any) => ({
      name: doc.place_name,
      address: doc.address_name || doc.road_address_name,
      latitude: parseFloat(doc.y),
      longitude: parseFloat(doc.x),
      type: doc.category_name?.includes('아파트') ? 'apartment' : 'house',
    }));
    
    console.log(`카카오 로컬 API: ${region}에서 ${properties.length}개 매물 발견`);
    return properties;
  } catch (error) {
    console.error('카카오 로컬 API 오류:', error);
    return [];
  }
}

// 모의 매물 데이터 생성 (API 실패 시 백업용)
export function generateMockProperties(region: string): Property[] {
  const baseProperties = {
    '서울': [
      { name: '래미안 강남 퍼스티지', address: '서울 강남구 역삼동 123', lat: 37.5006, lng: 127.0363, price: 15.5 },
      { name: '아크로리버파크', address: '서울 강남구 청담동 456', lat: 37.5219, lng: 127.0411, price: 18.2 },
      { name: '타워팰리스', address: '서울 강남구 도곡동 789', lat: 37.4881, lng: 127.0522, price: 25.8 },
      { name: '헬리오시티', address: '서울 송파구 거여동 101', lat: 37.4934, lng: 127.1459, price: 12.3 },
      { name: '롯데캐슬 골드', address: '서울 마포구 상암동 202', lat: 37.5791, lng: 126.8897, price: 9.8 },
      { name: '자이 서울숲', address: '서울 성동구 성수동', lat: 37.5443, lng: 127.0557, price: 14.2 },
      { name: '래미안 대치팰리스', address: '서울 강남구 대치동', lat: 37.4939, lng: 127.0623, price: 16.7 },
    ],
    '부산': [
      { name: '해운대 엘시티 더샵', address: '부산 해운대구 우동 1001', lat: 35.1627, lng: 129.1633, price: 12.5 },
      { name: '센텀파크 롯데캐슬', address: '부산 해운대구 센텀동 202', lat: 35.1699, lng: 129.1309, price: 11.2 },
      { name: '마린시티 두산위브', address: '부산 해운대구 우동 303', lat: 35.1588, lng: 129.1560, price: 13.8 },
      { name: '아이파크', address: '부산 해운대구 재송동 404', lat: 35.1893, lng: 129.1197, price: 8.5 },
      { name: '센텀 힐스테이트', address: '부산 해운대구 센텀동', lat: 35.1715, lng: 129.1323, price: 10.3 },
    ],
    '경기': [
      { name: '판교 푸르지오', address: '경기 성남시 분당구 판교동 501', lat: 37.3948, lng: 127.1108, price: 13.2 },
      { name: '킨텍스 자이', address: '경기 고양시 일산서구 대화동', lat: 37.6688, lng: 126.7516, price: 7.8 },
      { name: '광교 호수공원 푸르지오', address: '경기 수원시 영통구 이의동', lat: 37.2854, lng: 127.0595, price: 9.5 },
      { name: '동탄 롯데캐슬', address: '경기 화성시 동탄동', lat: 37.2004, lng: 127.0751, price: 8.2 },
    ],
    '인천': [
      { name: '송도 더샵 퍼스트파크', address: '인천 연수구 송도동 11', lat: 37.3895, lng: 126.6380, price: 10.5 },
      { name: '센트럴파크 푸르지오', address: '인천 연수구 송도동 22', lat: 37.3937, lng: 126.6431, price: 11.8 },
      { name: '송도 자이', address: '인천 연수구 송도동', lat: 37.3851, lng: 126.6443, price: 9.3 },
    ],
  };
  
  const regionKey = Object.keys(baseProperties).find(key => region.includes(key));
  const templates = regionKey ? baseProperties[regionKey as keyof typeof baseProperties] : baseProperties['서울'];
  
  return templates.map(prop => ({
    name: prop.name,
    address: prop.address,
    latitude: prop.lat,
    longitude: prop.lng,
    price: prop.price * 100000000, // 억원 → 원
    areaSize: Math.floor(Math.random() * 30 + 25), // 25-55평
    type: 'apartment' as const,
    tradeType: Math.random() > 0.3 ? 'sale' : 'rent' as const,
  }));
}

// 지역에서 매물 검색
export async function searchProperties(region: string): Promise<Property[]> {
  try {
    // 1. 한국부동산원 R-ONE API 시도
    console.log('[Property Search] Trying REB API for:', region);
    const rebResults = await searchPropertiesWithREB(region);
    if (rebResults.length > 0) {
      console.log('[Property Search] REB API success:', rebResults.length);
      return rebResults;
    }
    
    // 2. 카카오 로컬 API 시도
    console.log('[Property Search] Trying Kakao API for:', region);
    const kakaoResults = await searchPropertiesWithKakao(region);
    if (kakaoResults.length > 0) {
      console.log('[Property Search] Kakao API success:', kakaoResults.length);
      return kakaoResults;
    }
    
    // 3. 실패 시 모의 데이터 사용
    console.log('[Property Search] Using mock data for:', region);
    return generateMockProperties(region);
  } catch (error) {
    console.error('매물 검색 오류:', error);
    return generateMockProperties(region);
  }
}

