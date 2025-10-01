// app/api/fortune/generate/route.ts
// 부동산 사주/타로 운세 생성 API

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "../../../../server/config";

const openai = new OpenAI({
  apiKey: CONFIG.openaiApiKey,
});

// 고유한 공유 slug 생성
function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

// 이름과 생년월일 기반으로 일관된 시드 생성
function generateSeed(propertyId: string, userName: string, userBirth: string): number {
  const combined = `${propertyId}-${userName}-${userBirth}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // OpenAI seed는 양수여야 하고, 2^63 미만이어야 함
  return Math.abs(hash) % 2147483647;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      propertyId,
      propertyName,
      propertyType,
      propertyPrice,
      propertyAddress,
      userName,
      userBirth,
    } = body;

    if (!propertyId || !propertyName) {
      return NextResponse.json(
        { error: '매물 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 이름과 생년월일 필수 체크
    if (!userName || !userBirth) {
      return NextResponse.json(
        { error: '이름과 생년월일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // GPT 프롬프트 구성 - 사용자 정보가 있으면 더 개인화된 운세 제공
    const userInfo = userName && userBirth
      ? `\n\n🔮 상담자 정보:\n- 이름: ${userName}\n- 생년월일: ${userBirth}\n이 정보를 바탕으로 ${userName}님과 이 매물의 궁합을 봐주세요.`
      : '\n\n일반적인 이 매물의 기운과 운세를 봐주세요.';

    const systemPrompt = `당신은 30년 경력의 유명한 부동산 풍수 사주 전문가입니다.

역할:
- 매물의 위치, 가격대, 종류를 분석하여 풍수지리적 관점에서 운세를 봅니다
- 재미있고 긍정적이면서도 진지한 점술가의 톤을 유지합니다
- 매물의 특성을 고려한 구체적이고 실감나는 운세를 제공합니다
- 단순히 좋다/나쁘다가 아닌, 왜 그런지 근거를 제시합니다

중요:
- 매번 다른 독특한 관점과 해석을 제시하세요
- 실제 위치와 가격대의 특성을 반영하세요
- 재미있지만 신뢰감 있는 운세를 작성하세요`;

    const userPrompt = `🏠 매물 정보:
- 이름: ${propertyName}
- 종류: ${propertyType || '부동산'}
- 가격: ${propertyPrice || '정보 없음'}
- 위치: ${propertyAddress || '정보 없음'}${userInfo}

다음 형식으로 이 매물에 대한 부동산 사주 운세를 작성해주세요:

📍 **첫인상과 기운** (2-3문장)
이 매물이 가진 풍수적 에너지와 첫 느낌을 설명하세요.

💰 **재물운** (3-4문장)
투자 가치, 자산 증식, 재정적 안정성 등을 구체적으로 분석하세요.

🏡 **가정운과 생활운** (3-4문장)
가족 화목, 건강, 일상생활의 편안함, 이웃과의 관계 등을 다루세요.

✨ **총평과 조언** (2-3문장)
전체적인 운세 정리와 실용적인 조언을 제공하세요.

요구사항:
- 총 400-600자 분량으로 작성
- 각 섹션을 명확히 구분하되 자연스럽게 연결
- 위치와 가격대의 특성을 반영한 구체적인 내용
- 매번 다른 관점과 해석 제시 (창의성 발휘)
- 친근하면서도 신뢰감 있는 톤 유지

키워드 3-4개도 추출해주세요 (예: "재물운 대길", "가정 화목", "길지", "상승세").

JSON 형식으로 응답:
{
  "text": "운세 전체 텍스트 (섹션 제목 포함)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
}`;

    // 같은 사람 + 같은 매물 = 같은 사주가 나오도록 시드 생성
    const seed = generateSeed(propertyId, userName, userBirth);
    console.log(`🎲 사주 시드 생성: ${seed} (${userName}님 + ${propertyName})`);

    // GPT API 호출
    const completion = await openai.chat.completions.create({
      model: CONFIG.openaiModel,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.8, // 일관성과 창의성의 균형
      seed: seed, // 같은 입력 = 같은 결과
      response_format: { type: "json_object" },
    });

    // 응답 파싱 및 검증
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error("GPT 응답이 비어있습니다.");
    }

    const result = JSON.parse(responseContent);
    
    // 필수 필드 검증
    if (!result.text || typeof result.text !== 'string' || result.text.trim().length < 100) {
      throw new Error("운세 텍스트가 올바르게 생성되지 않았습니다.");
    }
    
    if (!result.keywords || !Array.isArray(result.keywords) || result.keywords.length < 3) {
      throw new Error("키워드가 올바르게 생성되지 않았습니다.");
    }

    const fortuneText = result.text.trim();
    const keywords = result.keywords.slice(0, 4); // 최대 4개까지만 사용

    // Supabase에 저장
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      // DB 저장 실패해도 결과는 반환
      return NextResponse.json({
        success: true,
        fortuneText,
        keywords,
        shareSlug: null,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const shareSlug = generateSlug();

    // 현재 사용자 가져오기 (있으면)
    const { data: { user } } = await supabase.auth.getUser();

    const { data: fortuneLog, error: dbError } = await supabase
      .from('fortune_log')
      .insert({
        user_id: user?.id || null,
        property_id: propertyId,
        property_name: propertyName,
        property_type: propertyType,
        property_price: propertyPrice,
        user_name: userName || null,
        user_birth: userBirth || null,
        fortune_text: fortuneText,
        fortune_keywords: keywords,
        share_slug: shareSlug,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB 저장 실패:", dbError);
      // DB 저장 실패해도 결과는 반환
      return NextResponse.json({
        success: true,
        fortuneText,
        keywords,
        shareSlug: null,
      });
    }

    return NextResponse.json({
      success: true,
      fortuneText,
      keywords,
      shareSlug,
      fortuneId: fortuneLog.id,
    });

  } catch (error) {
    console.error('운세 생성 API 에러:', error);
    
    // 상세한 에러 메시지 제공
    let errorMessage = '운세를 생성하는 중 오류가 발생했습니다.';
    let details = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'OpenAI API 키가 설정되지 않았습니다.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'API 사용량을 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('올바르게 생성되지')) {
        errorMessage = 'AI가 운세를 제대로 생성하지 못했습니다. 다시 시도해주세요.';
      }
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: details
      },
      { status: 500 }
    );
  }
}

