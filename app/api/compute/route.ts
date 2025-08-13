// /app/api/compute/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Card = {
  title: string;
  subtitle?: string;
  monthly?: string;
  totalInterest?: string;
  notes?: string[];
};

function safeJson(str: string) {
  try {
    const trimmed = String(str || "")
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "");
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const userText = String(message ?? "").trim();
    if (!userText)
      return NextResponse.json({ reply: "메시지가 비었어요." }, { status: 400 });

    // (1) 모델 호출: JSON만 반환하도록 지시
    const system =
      "너는 한국 부동산(매매/전세/월세) 상담사야. 초보도 이해할 쉬운 말로 설명하고," +
      '반드시 아래 JSON만 출력해. 형태: {"reply": string, "cards": Card[], "checklist": string[]}. ' +
      "Card는 {title, subtitle?, monthly?, totalInterest?, notes?[]}";

    const userPrompt =
      `사용자 입력: """${userText}"""\n\n` +
      "요구사항:\n" +
      "- 최신 정책/대출 상식에 맞게 요약 설명을 reply에 작성\n" +
      "- 가능한 경우 2~3개의 대출/전략 시나리오를 cards로 제공\n" +
      '- 어린이도 이해할 설명톤 유지\n' +
      "- JSON 이외의 텍스트 절대 금지";

    const comp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = comp.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeJson(raw);

    const reply: string =
      typeof parsed?.reply === "string"
        ? parsed.reply
        : "요청을 이해했어요. 조금 더 구체적으로 알려주시면 계산을 도와드릴게요!";

    const cards: Card[] = Array.isArray(parsed?.cards) ? parsed.cards : [];
    const checklist: string[] = Array.isArray(parsed?.checklist)
      ? parsed.checklist
      : [];

    // (2) Supabase 저장 (환경변수 없으면 자동 스킵)
    let share_url: string | undefined;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE) {
      try {
        const { data, error } = await supabaseAdmin
          .from("recommendations")
          .insert({
            input_text: userText,
            payload_json: { userText },
            reply,
            cards,
            checklist,
          })
          .select("public_id")
          .single();

        if (!error && data?.public_id) share_url = `/r/${data.public_id}`;
      } catch (e) {
        console.error("Supabase insert error:", e);
      }
    }

    return NextResponse.json({ reply, cards, checklist, share_url });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { reply: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
