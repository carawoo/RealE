// app/api/fortune/daily/route.ts
// 오늘의 운세 API

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "../../../../server/config";

const openai = new OpenAI({
  apiKey: CONFIG.openaiApiKey,
});

// 오늘 날짜 기반 시드 생성 (매일 같은 결과)
function generateDailySeed(): number {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 2147483647;
}

// 개인화된 시드 생성 (사용자 정보 + 날짜)
function generatePersonalSeed(userName: string, userBirth: string): number {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  const combined = `${dateString}-${userName}-${userBirth}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 2147483647;
}

// slug로 운세 조회
async function getFortuneBySlug(slug: string, type: string, date: string, seed: number) {
  try {
    const today = new Date();
    const dateString = today.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // slug에서 사용자 정보 추출 (개인화된 운세인 경우)
    let userName = '';
    let userBirth = '';
    if (type === 'personal' && slug.includes('-')) {
      const parts = slug.split('-');
      // personal-2025-10-03-1704488315-앵덕 형태
      if (parts.length >= 6) {
        userName = decodeURIComponent(parts[5]);
        userBirth = '1990-01-01'; // 기본값 설정
      }
    }

    const systemPrompt = type === 'personal' 
      ? `당신은 30년 경력의 유명한 부동산 풍수 사주 전문가입니다.

역할:
- 개인의 사주 정보를 바탕으로 매일 다른 개인화된 부동산 운세를 제공합니다
- 오늘 날짜의 특성과 개인의 사주를 결합한 맞춤형 조언을 합니다
- 솔직하고 균형잡힌 관점을 유지합니다 (장점과 주의사항 모두 제시)
- 구체적이고 실용적인 부동산 관련 조언을 제공합니다

중요 원칙:
- 개인의 사주 정보를 바탕으로 한 맞춤형 운세 제공
- 매일 완전히 다른 독특한 관점과 해석을 제시하세요
- 오늘 날짜의 특성과 개인 사주를 조화롭게 결합하세요
- 긍정적인 면과 주의할 면을 균형있게 제시하세요 (60% 긍정, 40% 주의)
- 과도한 미사여구나 무조건적인 칭찬은 피하세요
- 구체적인 조언과 보완 방법을 제시하세요`
      : `당신은 30년 경력의 유명한 부동산 풍수 사주 전문가입니다.

역할:
- 매일 다른 독특한 부동산 운세를 제공합니다
- 오늘 날짜의 특성을 반영한 현실적인 조언을 합니다
- 솔직하고 균형잡힌 관점을 유지합니다 (장점과 주의사항 모두 제시)
- 구체적이고 실용적인 부동산 관련 조언을 제공합니다

중요 원칙:
- 반드시 한국어로만 작성하세요
- 의미가 명확하고 자연스러운 문장을 사용하세요
- 매일 완전히 다른 독특한 관점과 해석을 제시하세요
- 오늘 날짜의 특성(요일, 계절, 날씨 등)을 반영하세요
- 긍정적인 면과 주의할 면을 균형있게 제시하세요 (60% 긍정, 40% 주의)
- 과도한 미사여구나 무조건적인 칭찬은 피하세요
- 구체적인 조언과 보완 방법을 제시하세요
- 이상한 표현이나 외국어 사용을 절대 금지하세요`;

    const userPrompt = type === 'personal'
      ? `오늘은 ${dateString}입니다.

🔮 상담자 정보:
- 이름: ${userName}
- 생년월일: ${userBirth || '정보 없음'}

다음 형식으로 ${userName}님의 오늘의 부동산 운세를 작성해주세요:

🌅 **${userName}님의 오늘 부동산 기운** (2-3문장)
${userName}님의 사주와 오늘 날짜의 특성을 결합한 부동산 관련 기운을 설명하세요.

💰 **투자운과 매매운** (3-4문장)
${userName}님의 사주를 바탕으로 오늘 하루 부동산 투자나 매매에 대한 운세를 분석하세요.
- 좋은 시기와 주의해야 할 시기를 구체적으로 언급
- 개인에게 맞는 특별한 조언이나 팁 제공

🏠 **계약과 거래운** (2-3문장)
${userName}님의 사주를 고려하여 오늘 계약이나 거래를 진행할 때의 운세와 주의사항을 제시하세요.

⚠️ **주의사항** (2-3문장)
${userName}님께서 오늘 특히 주의해야 할 부동산 관련 사항들을 명확히 제시하세요.

✨ **오늘의 개인 조언** (2-3문장)
${userName}님의 사주에 맞는 오늘 하루 부동산 관련 실천 조언을 제공하세요.

요구사항:
- 총 500-700자 분량으로 작성
- 반드시 한국어로만 작성하세요
- 의미가 명확하고 자연스러운 문장 사용
- 개인의 사주 정보를 반영한 맞춤형 내용
- 긍정 60% + 주의사항 40%의 균형 유지
- 오늘 날짜의 특성과 개인 사주를 조화롭게 결합
- 실제 사주처럼 솔직하고 현실적으로
- 매일 완전히 다른 독특한 관점 제시
- 이상한 표현이나 외국어 사용 금지

키워드 3-4개도 추출하세요. 긍정/중립/주의 키워드를 섞어서.
(예: "개인 대길", "신중 필요", "계약 주의", "발전 가능").

JSON 형식으로 응답:
{
  "text": "운세 전체 텍스트 (섹션 제목 포함)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
}`
      : `오늘은 ${dateString}입니다.

다음 형식으로 오늘의 부동산 운세를 작성해주세요:

🌅 **오늘의 부동산 기운** (2-3문장)
오늘 날짜의 특성을 반영한 부동산 시장의 전반적인 기운과 에너지를 설명하세요.

💰 **투자운과 매매운** (3-4문장)
오늘 하루 부동산 투자나 매매에 대한 운세를 현실적으로 분석하세요.
- 좋은 시기와 주의해야 할 시기를 구체적으로 언급
- 오늘의 특별한 조언이나 팁 제공

🏠 **계약과 거래운** (2-3문장)
오늘 계약이나 거래를 진행할 때의 운세와 주의사항을 제시하세요.

⚠️ **주의사항** (2-3문장)
오늘 특히 주의해야 할 부동산 관련 사항들을 명확히 제시하세요.

✨ **오늘의 조언** (2-3문장)
오늘 하루 부동산 관련해서 실천하면 좋을 구체적인 조언을 제공하세요.

요구사항:
- 총 500-700자 분량으로 작성
- 긍정 60% + 주의사항 40%의 균형 유지
- 오늘 날짜의 특성을 반영한 구체적인 내용
- 실제 사주처럼 솔직하고 현실적으로
- 매일 완전히 다른 독특한 관점 제시

키워드 3-4개도 추출하세요. 긍정/중립/주의 키워드를 섞어서.
(예: "투자 대길", "신중 필요", "계약 주의", "발전 가능").

JSON 형식으로 응답:
{
  "text": "운세 전체 텍스트 (섹션 제목 포함)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
}`;

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
      temperature: 1.2,
      seed: parseInt(seed) || generateDailySeed(),
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
    const keywords = result.keywords.slice(0, 4);

    return NextResponse.json({
      success: true,
      fortuneText,
      keywords,
      date: dateString,
      type: type,
      userName: type === 'personal' ? userName : undefined
    });

  } catch (error) {
    console.error('slug로 운세 조회 API 에러:', error);
    
    let errorMessage = '운세 데이터를 가져오는 중 오류가 발생했습니다.';
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

// 일반 오늘의 운세 생성
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const dateString = today.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const systemPrompt = `당신은 30년 경력의 유명한 부동산 풍수 사주 전문가입니다.

역할:
- 매일 다른 독특한 부동산 운세를 제공합니다
- 오늘 날짜의 특성을 반영한 현실적인 조언을 합니다
- 솔직하고 균형잡힌 관점을 유지합니다 (장점과 주의사항 모두 제시)
- 구체적이고 실용적인 부동산 관련 조언을 제공합니다

중요 원칙:
- 매일 완전히 다른 독특한 관점과 해석을 제시하세요
- 오늘 날짜의 특성(요일, 계절, 날씨 등)을 반영하세요
- 긍정적인 면과 주의할 면을 균형있게 제시하세요 (60% 긍정, 40% 주의)
- 과도한 미사여구나 무조건적인 칭찬은 피하세요
- 구체적인 조언과 보완 방법을 제시하세요`;

    const userPrompt = `오늘은 ${dateString}입니다.

다음 형식으로 오늘의 부동산 운세를 작성해주세요:

🌅 **오늘의 부동산 기운** (2-3문장)
오늘 날짜의 특성을 반영한 부동산 시장의 전반적인 기운과 에너지를 설명하세요.

💰 **투자운과 매매운** (3-4문장)
오늘 하루 부동산 투자나 매매에 대한 운세를 현실적으로 분석하세요.
- 좋은 시기와 주의해야 할 시기를 구체적으로 언급
- 오늘의 특별한 조언이나 팁 제공

🏠 **계약과 거래운** (2-3문장)
오늘 계약이나 거래를 진행할 때의 운세와 주의사항을 제시하세요.

⚠️ **주의사항** (2-3문장)
오늘 특히 주의해야 할 부동산 관련 사항들을 명확히 제시하세요.

✨ **오늘의 조언** (2-3문장)
오늘 하루 부동산 관련해서 실천하면 좋을 구체적인 조언을 제공하세요.

요구사항:
- 총 500-700자 분량으로 작성
- 긍정 60% + 주의사항 40%의 균형 유지
- 오늘 날짜의 특성을 반영한 구체적인 내용
- 실제 사주처럼 솔직하고 현실적으로
- 매일 완전히 다른 독특한 관점 제시

키워드 3-4개도 추출하세요. 긍정/중립/주의 키워드를 섞어서.
(예: "투자 대길", "신중 필요", "계약 주의", "발전 가능").

JSON 형식으로 응답:
{
  "text": "운세 전체 텍스트 (섹션 제목 포함)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
}`;

    // 오늘 날짜 기반 시드 생성
    const seed = generateDailySeed();
    console.log(`🎲 오늘의 운세 시드 생성: ${seed} (${dateString})`);

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
      temperature: 1.2,
      seed: seed,
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
    const keywords = result.keywords.slice(0, 4);

    return NextResponse.json({
      success: true,
      fortuneText,
      keywords,
      date: dateString,
      type: 'daily'
    });

  } catch (error) {
    console.error('❌ 오늘의 운세 생성 API 에러:', error);
    console.error('❌ 에러 스택:', error instanceof Error ? error.stack : 'No stack');
    
    let errorMessage = '오늘의 운세를 생성하는 중 오류가 발생했습니다.';
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

// 개인화된 오늘의 운세 생성 또는 slug로 운세 조회
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/fortune/daily 요청 시작');
    const body = await request.json();
    console.log('📝 요청 본문:', JSON.stringify(body, null, 2));
    const { userName, userBirth, type, date, seed, slug } = body;

    // slug로 운세 조회하는 경우
    if (slug) {
      console.log('🔗 slug로 운세 조회:', { slug, type, date, seed });
      return await getFortuneBySlug(slug, type, date, seed);
    }

    if (!userName || !userBirth) {
      return NextResponse.json(
        { error: '이름과 생년월일을 입력해주세요.' },
        { status: 400 }
      );
    }

    const today = new Date();
    const dateString = today.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const systemPrompt = `당신은 30년 경력의 유명한 부동산 풍수 사주 전문가입니다.

역할:
- 개인의 사주 정보를 바탕으로 매일 다른 개인화된 부동산 운세를 제공합니다
- 오늘 날짜의 특성과 개인의 사주를 결합한 맞춤형 조언을 합니다
- 솔직하고 균형잡힌 관점을 유지합니다 (장점과 주의사항 모두 제시)
- 구체적이고 실용적인 부동산 관련 조언을 제공합니다

중요 원칙:
- 개인의 사주 정보를 바탕으로 한 맞춤형 운세 제공
- 매일 완전히 다른 독특한 관점과 해석을 제시하세요
- 오늘 날짜의 특성과 개인 사주를 조화롭게 결합하세요
- 긍정적인 면과 주의할 면을 균형있게 제시하세요 (60% 긍정, 40% 주의)
- 과도한 미사여구나 무조건적인 칭찬은 피하세요
- 구체적인 조언과 보완 방법을 제시하세요`;

    const userPrompt = `오늘은 ${dateString}입니다.

🔮 상담자 정보:
- 이름: ${userName}
- 생년월일: ${userBirth}

다음 형식으로 ${userName}님의 오늘의 부동산 운세를 작성해주세요:

🌅 **${userName}님의 오늘 부동산 기운** (2-3문장)
${userName}님의 사주와 오늘 날짜의 특성을 결합한 부동산 관련 기운을 설명하세요.

💰 **투자운과 매매운** (3-4문장)
${userName}님의 사주를 바탕으로 오늘 하루 부동산 투자나 매매에 대한 운세를 분석하세요.
- 좋은 시기와 주의해야 할 시기를 구체적으로 언급
- 개인에게 맞는 특별한 조언이나 팁 제공

🏠 **계약과 거래운** (2-3문장)
${userName}님의 사주를 고려하여 오늘 계약이나 거래를 진행할 때의 운세와 주의사항을 제시하세요.

⚠️ **주의사항** (2-3문장)
${userName}님께서 오늘 특히 주의해야 할 부동산 관련 사항들을 명확히 제시하세요.

✨ **오늘의 개인 조언** (2-3문장)
${userName}님의 사주에 맞는 오늘 하루 부동산 관련 실천 조언을 제공하세요.

요구사항:
- 총 500-700자 분량으로 작성
- 반드시 한국어로만 작성하세요
- 의미가 명확하고 자연스러운 문장 사용
- 개인의 사주 정보를 반영한 맞춤형 내용
- 긍정 60% + 주의사항 40%의 균형 유지
- 오늘 날짜의 특성과 개인 사주를 조화롭게 결합
- 실제 사주처럼 솔직하고 현실적으로
- 매일 완전히 다른 독특한 관점 제시
- 이상한 표현이나 외국어 사용 금지

키워드 3-4개도 추출하세요. 긍정/중립/주의 키워드를 섞어서.
(예: "개인 대길", "신중 필요", "계약 주의", "발전 가능").

JSON 형식으로 응답:
{
  "text": "운세 전체 텍스트 (섹션 제목 포함)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
}`;

    // 개인화된 시드 생성
    const personalSeed = generatePersonalSeed(userName, userBirth);
    console.log(`🎲 개인화 오늘의 운세 시드 생성: ${personalSeed} (${userName}님 + ${dateString})`);

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
      temperature: 1.2,
      seed: personalSeed,
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
    const keywords = result.keywords.slice(0, 4);

    // Supabase에 저장 (선택사항)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // 현재 사용자 가져오기 (있으면)
        const { data: { user } } = await supabase.auth.getUser();

        await supabase
          .from('fortune_log')
          .insert({
            user_id: user?.id || null,
            property_id: 'daily-fortune',
            property_name: '오늘의 운세',
            property_type: 'daily',
            property_price: null,
            user_name: userName,
            user_birth: userBirth,
            fortune_text: fortuneText,
            fortune_keywords: keywords,
            share_slug: null, // 개인화된 운세는 공유하지 않음
          });
      } catch (dbError) {
        console.error("DB 저장 실패:", dbError);
        // DB 저장 실패해도 결과는 반환
      }
    }

    return NextResponse.json({
      success: true,
      fortuneText,
      keywords,
      date: dateString,
      type: 'personal',
      userName
    });

  } catch (error) {
    console.error('개인화 오늘의 운세 생성 API 에러:', error);
    
    let errorMessage = '개인화된 오늘의 운세를 생성하는 중 오류가 발생했습니다.';
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
