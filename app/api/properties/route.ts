// app/api/properties/route.ts
// 부동산 매물 검색 API

import { NextRequest, NextResponse } from "next/server";
import { searchProperties } from "../../../server/domain/realestate/property-search";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');

    if (!region) {
      return NextResponse.json(
        { error: 'Region parameter is required' },
        { status: 400 }
      );
    }

    const properties = await searchProperties(region);

    return NextResponse.json({
      success: true,
      region,
      count: properties.length,
      properties,
    });

  } catch (error) {
    console.error('매물 검색 API 에러:', error);
    return NextResponse.json(
      { 
        error: '매물 정보를 조회하는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

