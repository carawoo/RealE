// app/api/compute/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// export const runtime = "edge"; // 원하면 엣지로

type Card = {
  title: string;
  subtitle?: string;
  monthly?: string;
  totalInterest?: string;
  notes?: string[];
};

type ApiOut = {
  reply: string;
  cards?: Card[];
  checklist?: string[];
  share_url?: string;
};

function extractJSON(text: string | null | undefined): Partial<ApiOut> | null {
  if (!text) return null;

  // ```json ... ``` 안의 내용 우선 추출
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const raw = fence ? fence[1] : text;

  // 가장 바깥 { ... } 범위만 뽑아서 파싱 시도
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const slice = raw.slice(first, last + 1);
    try {
      const obj = JSON.parse(slice);
      if (obj && typeof obj === "object") return obj as Partial<ApiOut>;
    } catch {
      /* fallthrough */
    }
  }
  return null;
}

function sanitize(out: Partial<ApiOut>, fallbackText: string): ApiOut {
  const reply =
    typeof out.reply === "string" && out.reply.trim()
      ? out.reply.trim()
      : (fallbackText || "분석 결과를 정리했어요.");

  const cards = Array.isArray(out.cards)
    ? out.cards
        .filter((c) => c && typeof c === "object")
        .map((c) => ({
          title: String((c as any).title ?? "").trim(),
          subtitle: (c as any).subtitle ? String((c as any).subtitle) : undefined,
          monthly: (c as any).monthly ? String((c as any).monthly) : undefined,
          totalInterest: (c as any).totalInterest ? String((c as any).totalInterest) : undefined,
          notes: Array.isArray((c as any).notes)
            ? (c as any).notes.map((n: any) => String(n))
            : undefined,
        }))
        .filter((c) => c.title)
    : undefined;

  const checklist = Array.isArray(out.checklist)
    ? out.checklist.map((n: any) => String(n))
    : undefined;

  const share_url =
    typeof out.share_url === "string" && out.share_url.startsWith("/")
      ? out.share_url
      : undefined;

  return { reply, cards, checklist, share_url };
}

export async function POST(req: Request) {
  try {
    const { message } = (await req.json().catch(() => ({}))) as {
      message?: unknown;
    };
    const userMessage =
      typeof message === "string" && message.trim() ? message.trim() : "";

    // API 키 없으면 200으로 소프트 에러 (프론트 UX 유지)
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json<ApiOut>(
        {
          reply:
            "서버 설정(OPENAI_API_KEY)이 비어 있어요. 관리자에게 문의해 주세요.",
          cards: [],
        },
        { status: 200 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 모델/온도는 환경변수로도 오버라이드 가능
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const sys =
      `너는 한국 부동산 상담 도우미야. 사용자 입력이 자유로운 구어체여도 ` +
      `의미를 분석해 매매/전세/월세 맥락을 파악하고, 초보자도 이해할 쉬운 한국어로 설명해.` +
      `항상 아래 JSON만 반환하도록 노력해. 마크다운/설명 말고 JSON 본문만.\n\n` +
      `반환 JSON 스키마(예):\n` +
      `{\n` +
      `  "reply": "짧은 요약 한 문단",\n` +
      `  "cards": [\n` +
      `    { "title": "1. 고정금리 대출", "subtitle": "안정적인 상환", "monthly": "2,020,701 원", "totalInterest": "277,452,394 원", "notes": ["금리: 3.5%", "기간: 30년", "방식: 원리금 균등"] },\n` +
      `    { "title": "2. 변동금리 대출", "subtitle": "금리 변동 리스크", "monthly": "1,849,025 원", "totalInterest": "215,648,998 원", "notes": ["금리: 2.8%", "기간: 30년", "방식: 원리금 균등"] }\n` +
      `  ],\n` +
      `  "checklist": ["재직증명서", "소득증빙(원천징수/급여명세)"],\n` +
      `  "share_url": "/r/abc123"\n` +
      `}\n\n` +
      `카드가 없으면 "cards"는 생략 가능.` +
      `사용자가 월세를 말했는데 보증금(보유자금)이 100 미만이면 '보증금은 최소 100만원 이상 입력' 같은 친절한 코멘트도 reply에 포함.` +
      `모든 숫자는 "3,200,000 원"처럼 보기 좋게 천단위 콤마와 단위 포함 문자열로.` +
      `최신 정책/금리는 정확한 수치 대신 "최근 금리 수준/정책 방향"을 설명하되, '확정'처럼 단정 표현은 피하고 안내 형식으로.`

    const prompt =
      userMessage ||
      "상담 시작: 매매/전세/월세 중 무엇을 검토할지 모르겠어요. 상황부터 질문해 주세요.";

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
    });

    const text =
      completion.choices?.[0]?.message?.content?.trim() ?? "";

    // 1) 모델이 JSON을 잘 주면 그대로, 2) 아니면 본문에서 JSON 부분만 추출
    const parsed = extractJSON(text);

    const out = sanitize(parsed ?? { reply: text }, text);
    return NextResponse.json<ApiOut>(out, { status: 200 });
  } catch (e) {
    console.error(e);
    // 실패해도 200으로 소프트 리턴 (UI 끊기지 않게)
    return NextResponse.json<ApiOut>(
      {
        reply: "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
        cards: [],
      },
      { status: 200 }
    );
  }
}
