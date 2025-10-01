// app/api/fortune/image/route.ts
// 타로 카드 스타일 이미지 생성 API

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { CONFIG } from "../../../../server/config";

const openai = new OpenAI({
  apiKey: CONFIG.openaiApiKey,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, propertyName } = body;

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: '키워드가 필요합니다.' },
        { status: 400 }
      );
    }

    // DALL-E 프롬프트 구성 - 키워드를 기반으로 다양한 이미지 생성
    const keywordsText = keywords.join(', ');
    
    // 랜덤 요소 추가하여 매번 다른 스타일 생성
    const styles = [
      'elegant Korean traditional ink painting style',
      'modern minimalist Korean design with mystical elements',
      'vibrant Korean folk art style with fortune symbols',
      'serene Korean zen aesthetic with feng shui elements'
    ];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    
    const colorSchemes = [
      'gold and deep purple gradients',
      'jade green and soft blue tones',
      'warm amber and crimson red',
      'royal blue and silver accents'
    ];
    const randomColors = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];

    const prompt = `Create a mystical fortune telling card for Korean real estate (부동산 사주).

Theme Keywords: ${keywordsText}
Property: ${propertyName || 'House'}

Visual Style: ${randomStyle}

Image must include:
- Central mystical symbol representing the fortune keywords
- Korean traditional decorative patterns (한복 무늬, 단청 문양)
- Elegant ornamental border with fortune symbols (복, 재물, 길)
- ${randomColors}
- Harmonious composition with mystical atmosphere
- No text or Korean characters, only visual symbols
- Professional tarot card aesthetic

Art Direction: 
- High quality digital illustration
- Mystical and inviting mood
- Balance between traditional Korean aesthetics and modern design
- Fortune telling card style with decorative elements`;

    // DALL-E API 호출
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid",
    });

    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      throw new Error("DALL-E가 이미지 URL을 반환하지 않았습니다.");
    }

    console.log('✅ DALL-E 이미지 생성 성공:', imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      revisedPrompt: response.data[0]?.revised_prompt, // DALL-E가 수정한 프롬프트
    });

  } catch (error) {
    console.error('❌ 이미지 생성 API 에러:', error);
    
    // 상세한 에러 로깅
    if (error instanceof Error) {
      console.error('에러 상세:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }
    
    // DALL-E 실패 시 명확한 에러 반환
    let errorMessage = '이미지 생성에 실패했습니다.';
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'OpenAI API 키가 설정되지 않았습니다.';
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorMessage = 'DALL-E API 사용량을 초과했습니다.';
      } else if (error.message.includes('content_policy')) {
        errorMessage = '콘텐츠 정책에 위배되어 이미지를 생성할 수 없습니다.';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
      // 프로덕션에서는 미리 준비된 타로 카드 이미지 세트를 사용하세요
      fallbackSuggestion: '사전 제작된 타로 카드 이미지를 사용하는 것을 권장합니다.'
    }, { status: 500 });
  }
}

