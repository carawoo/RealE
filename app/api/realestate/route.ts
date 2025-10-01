// app/api/realestate/route.ts
// 부동산 정보 조회 API

import { NextRequest, NextResponse } from "next/server";
import { 
  getHousingPriceTrend, 
  getRegionalRealEstateData, 
  getTransactionStatus,
  formatRealEstateInfo,
  formatRealEstateSummary 
} from "../../../server/domain/realestate/reb-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'national';
    const region = searchParams.get('region') || '전국';
    const format = searchParams.get('format') || 'detailed'; // detailed, summary

    let result;

    switch (type) {
      case 'national':
        result = await getHousingPriceTrend();
        break;
      case 'regional':
        result = await getRegionalRealEstateData(region);
        break;
      case 'transaction':
        result = await getTransactionStatus();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: national, regional, or transaction' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // 포맷에 따라 응답 형태 결정
    const response = {
      success: true,
      type,
      region: result.data?.region || region,
      data: result.data,
      formatted: format === 'summary' 
        ? formatRealEstateSummary(result.data!)
        : formatRealEstateInfo(result.data!),
      lastUpdated: result.data?.lastUpdated
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('부동산 정보 조회 API 에러:', error);
    return NextResponse.json(
      { 
        error: '부동산 정보를 조회하는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, region } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // 쿼리 분석하여 적절한 데이터 조회
    let result;
    
    if (query.includes('거래') || query.includes('매매량') || query.includes('거래량')) {
      result = await getTransactionStatus();
    } else if (region && region !== '전국') {
      result = await getRegionalRealEstateData(region);
    } else {
      result = await getHousingPriceTrend();
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const response = {
      success: true,
      query,
      region: result.data?.region || '전국',
      data: result.data,
      formatted: formatRealEstateInfo(result.data!),
      summary: formatRealEstateSummary(result.data!),
      lastUpdated: result.data?.lastUpdated
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('부동산 정보 조회 API 에러:', error);
    return NextResponse.json(
      { 
        error: '부동산 정보를 조회하는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
