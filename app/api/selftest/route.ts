// app/api/compute/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 클라이언트가 자유채팅(message) 혹은 표준 fields를 보낼 때 모두 수용
type Fields = {
  intent?: "매매" | "전세" | "월세";
  budget_krw?: number;          // 목표가격(원)
  cash_krw?: number;            // 보유현금(원)
  income_year_krw?: number;     // 연소득(원)
  tenure_months?: number;       // 재직개월
  region?: string;              // 지역
  loan_years?: number;          // 대출기간(년)
  rate_type?: "고정" | "변동";
  prefer?: string;              // 예: "체증식"
};

function getIP(req: Request) {
  const xff = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return xff || (req as any).ip || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messageRaw = typeof body?.message === "string" ? body.message : "";
    const fields: Fields | undefined = body?.fields;

    // 1) 프롬프트 구성: 자유문 + 필드 동시 지원
    const userBlob =
      [
        messageRaw && `자유서술: ${messageRaw}`,
        fields && `구조화입력: ${JSON.stringify(fields)}`,
      ]
        .filter(Boolean)
        .join("\n");

    if (!userBlob) {
      return NextResponse.json(
        { ok: false, error: "message 또는 fields 중 하나는 필요합니다." },
        { status: 400 }
      );
    }

    // 2) 모델 호출: 항상 JSON으로만 반환
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            [
              "너는 한국 부동산 초보 사용자에게 ‘쉬운 말’로 설명하는 상담사야.",
              "입력은 자유채팅 또는 구조화 필드(fields)로 온다.",
              "월세의 경우 보유현금 최소 100만원 없으면 경고를 포함한다.",
              "출력은 JSON 하나로만 반환하고, 설명은 어린이도 이해할 만큼 쉽게 쓴다.",
              "출력스키마:",
              `{
                "reply": "짧은 핵심 설명",
                "cards": [
                  {
                    "title":"최대 한도형/안전 상환형/정책 활용형 중 하나",
                    "subtitle":"간단 부연",
                    "monthly":"월 상환 예상액(숫자+원)",
                    "totalInterest":"총 이자(숫자+원)",
                    "notes":["주의/팁 등 배열"]
                  }
                ],
                "checklist": ["필요 서류 등", "..."]  // 선택
              }`,
            ].join("\n"),
        },
        {
          role: "user",
          content:
            [
              "다음 사용자의 상황을 분석해 JSON으로만 답해.",
              userBlob,
            ].join("\n"),
        },
      ],
    });

    const jsonText =
      completion.choices?.[0]?.message?.content?.trim() || "{}";

    // 3) JSON 파싱 (깨짐 방어)
    let payload: any = {};
    try {
      payload = JSON.parse(jsonText);
    } catch {
      payload = { reply: "분석에 실패했습니다. 한 번만 다시 시도해 주세요." };
    }

    // 결과 최소값 보정
    if (!Array.isArray(payload.cards)) payload.cards = [];
    if (!Array.isArray(payload.checklist)) payload.checklist = [];

    // 4) DB 저장 (SERVICE_ROLE 있을 때만)
    let share_url: string | undefined;
    if (process.env.SUPABASE_SERVICE_ROLE) {
      try {
        const { supabaseAdmin } = await import("@/lib/supabase");

        // 대화 row
        const ip = getIP(req);
        const ua = req.headers.get("user-agent") || "";
        const convIns = await supabaseAdmin
          .from("conversations")
          .insert({ ip, user_agent: ua })
          .select("id")
          .single();

        const conversation_id = convIns.data?.id;

        // 메시지 row (유저 + 어시스턴트 응답 저장)
        await supabaseAdmin.from("messages").insert({
          conversation_id,
          role: "user",
          content: messageRaw || "",
          fields: fields || null,
        });

        await supabaseAdmin.from("messages").insert({
          conversation_id,
          role: "assistant",
          content: payload?.reply || "",
          reply: payload || null,
          cards: payload?.cards || null,
          checklist: payload?.checklist || null,
        });

        // 공유용 row
        const recIns = await supabaseAdmin
          .from("recommendations")
          .insert({
            conversation_id,
            payload,
          })
          .select("id")
          .single();

        const recId = recIns.data?.id;
        if (recId) share_url = `/r/${recId}`;
      } catch (e) {
        console.warn("[compute] save skipped:", (e as any)?.message);
      }
    }

    return NextResponse.json({ ok: true, ...payload, share_url });
  } catch (e: any) {
    console.error("[/api/compute] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}