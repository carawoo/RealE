// app/api/compute/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = `
당신은 한국 부동산 상담사 RealE입니다.
항상 JSON으로만 답합니다: { "reply": string, "cards": [{ "title": string, "subtitle"?: string, "monthly"?: string, "totalInterest"?: string, "notes"?: string[] }], "checklist"?: string[] }
- 사용자가 자유롭게 말해도 핵심(매매/전세/월세, 예산, 지역, 기간 등)을 추출해서 안내하세요.
- 부동산과 무관한 질문이면 정중히 리다이렉트하는 안내문을 reply에 넣고 cards는 비웁니다.
- 월세일 때 보증금이 비현실적으로 낮으면(예: 100 미만) 보증금 가이드(예: "최소 100만 원 이상…")를 reply에 친절히 설명하세요.
- 초보자도 이해하기 쉽게, 쉬운 어휘와 짧은 문장으로 설명하세요.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const raw = typeof body?.message === "string" ? body.message : "";

    const userPrompt = `
사용자 메시지(그대로): """${raw.slice(0, 2000)}"""

요구사항:
1) 만약 부동산과 무관하면 reply에 "부동산 상담 전용"임을 친절히 알리고, 어떤 정보를 주면 계산해줄지 예시를 한국어로 안내. cards는 [].
2) 부동산 관련이면 아래 JSON 스키마에 맞게 값을 채워서 내보내기.
- reply: 쉬운 설명 요약(아이도 이해할 수준)
- cards: 0~3개. 각 카드엔 title, subtitle(선택), monthly/totalInterest(선택), notes(글머리표 2~4줄)
- checklist: 필요 서류가 있다면 2~5개(선택)
JSON만 출력하세요.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const jsonStr = completion.choices?.[0]?.message?.content ?? "{}";

    let out: any;
    try {
      out = JSON.parse(jsonStr);
    } catch {
      out = {};
    }

    const reply =
      typeof out.reply === "string"
        ? out.reply
        : "요청을 이해했어요. 목적(매매/전세/월세), 예산, 지역 등을 한 줄로 알려주시면 바로 계산해드릴게요!";

    const cards = Array.isArray(out.cards) ? out.cards : [];
    const checklist = Array.isArray(out.checklist) ? out.checklist : [];

    return NextResponse.json({ reply, cards, checklist });
  } catch (err) {
    console.error("compute error", err);
    // 200으로도 안전하게 처리(프론트가 항상 JSON을 받도록)
    return NextResponse.json(
      {
        reply:
          "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요. 문제가 계속되면 간단히 '매매, 예산 6억, 수도권'처럼 입력해 보세요!",
        cards: [],
        checklist: [],
      },
      { status: 200 }
    );
  }
}
