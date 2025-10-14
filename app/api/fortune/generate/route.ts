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
- 솔직하고 현실적인 점술가의 톤을 유지합니다 (장점과 단점을 모두 제시)
- 매물의 특성을 고려한 구체적이고 실감나는 운세를 제공합니다
- 단순히 좋다/나쁘다가 아닌, 왜 그런지 구체적 근거를 제시합니다

중요 원칙:
- 매번 완전히 다른 독특한 관점과 해석을 제시하세요 (절대 반복 금지)
- 실제 위치와 가격대의 특성을 반영하세요
- 긍정적인 면과 부정적인 면을 균형있게 제시하세요
- 실제 사주처럼 좋은 점 60%, 주의할 점 40% 비율로 구성
- 과도한 미사여구나 무조건적인 칭찬은 피하세요
- 구체적인 조언과 보완 방법을 제시하세요
- **절대적으로 중요**: 오직 한국어만 사용하세요. 영어, 아랍어, 중국어 등 모든 외국어 사용을 엄격히 금지합니다.
- 모든 단어와 문장을 한국어로만 작성하세요`;

    const userPrompt = `🏠 매물 정보:
- 이름: ${propertyName}
- 종류: ${propertyType || '부동산'}
- 가격: ${propertyPrice || '정보 없음'}
- 위치: ${propertyAddress || '정보 없음'}${userInfo}

다음 형식으로 이 매물에 대한 부동산 사주 운세를 작성해주세요:

📍 **첫인상과 기운** (2-3문장)
이 매물의 풍수적 에너지와 첫 느낌을 솔직하게 설명하세요. 긍정적인 면과 함께 주의할 점도 언급하세요.

💰 **재물운** (3-4문장)
투자 가치, 자산 증식 가능성을 현실적으로 분석하세요. 좋은 점과 리스크를 모두 제시하세요.
- 좋은 시기와 주의해야 할 시기를 구체적으로 언급
- 가격 대비 가치, 향후 전망 등을 객관적으로

🏡 **가정운과 생활운** (3-4문장)
가족 화목, 건강, 일상의 편안함을 솔직하게 평가하세요. 보완이 필요한 부분도 명확히 지적하세요.
- 긍정적인 면: 2문장
- 개선이 필요한 면: 1-2문장

⚠️ **주의사항과 보완책** (2-3문장)
이 매물의 약점이나 개선할 점을 명확히 제시하고, 구체적인 해결책을 제안하세요.

✨ **총평과 조언** (2-3문장)
종합 평가 (10점 만점 기준도 제시)와 실용적인 조언을 제공하세요.

요구사항:
- 총 500-700자 분량으로 작성
- 긍정 60% + 주의사항 40%의 균형 유지
- 실제 사주처럼 솔직하고 현실적으로
- 위치와 가격대의 특성을 반영한 구체적인 내용
- 매번 완전히 다른 독특한 관점 제시 (절대 비슷하게 쓰지 마세요)
- 무조건적인 칭찬보다 실질적인 분석과 조언
- **필수**: 모든 내용을 순수 한국어로만 작성하세요. 외국어(영어, 아랍어, 중국어 등) 단어나 문자를 절대 사용하지 마세요.

키워드 3-4개도 추출하세요. 긍정/중립/주의 키워드를 섞어서.
(예: "재물운 대길", "주의 필요", "보완 권장", "발전 가능").

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
      temperature: 1.2, // 높은 창의성과 다양성
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

