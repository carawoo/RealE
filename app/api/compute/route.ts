// app/api/compute/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 캐시 막기 (선택)
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1) 입력 안전 처리
    const { message } = await req.json().catch(() => ({ message: "" }));
    const raw = (typeof message === "string" ? message : "").trim();

    if (!raw) {
      return NextResponse.json(
        {
          reply:
            '무엇을 도와드릴까요? 예) "매매, 예산 6억, 보유 8천, 연소득 4500, 수도권, 30년, 체증식 선호"',
          cards: [],
          checklist: [],
        },
        { status: 200 }
      );
    }

    // 2) 구조화 결과 스키마 (프론트가 기대하는 키 유지)
    const schema = {
      name: "RealEResult",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          reply: { type: "string" },
          cards: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                subtitle: { type: "string" },
                monthly: { type: "string" },
                totalInterest: { type: "string" },
                notes: { type: "array", items: { type: "string" } },
              },
              required: ["title"],
            },
          },
          checklist: { type: "array", items: { type: "string" } },
          share_url: { type: "string" },
        },
        required: ["reply"],
      },
    };

    // 3) 프롬프트 (자유문장도 이해 + 초보자 친화 설명)
    const sys =
      "너는 한국의 부동산/대출 도우미야. " +
      "최신 정책/대출 상식에 맞춰 초보자도 이해하기 쉽게 설명하고, " +
      "가능하면 대안(지금/대기 전략) 비교를 카드 형태로 요약해.";

    const user =
      `사용자 입력(자유문장): ${raw}\n` +
      "JSON만 반환. 숫자는 천단위 구분 포함 한국어 표기 가능.";

    // 4) **타입 우회용 any 캐스팅** — 여기만 핵심!
    const body: any = {
      model: "gpt-4o-mini",
      input: [sys, user].join("\n"),
      response_format: { type: "json_schema", json_schema: schema },
    };

    const resp = await openai.responses.create(body);

    // 5) 가능한 경로에서 텍스트/파싱값 회수
    const txt =
      (resp as any).output_text ??
      (resp as any)?.choices?.[0]?.message?.content ??
      "";
    let data: any = null;

    // (a) 텍스트가 JSON 형태라면 파싱
    if (typeof txt === "string") {
      try {
        data = JSON.parse(txt);
      } catch {}
    }

    // (b) 일부 SDK는 parsed 위치에 구조화 결과가 들어옴
    if (!data) {
      const parsed =
        (resp as any)?.output?.[0]?.content?.find?.(
          (c: any) => c.type === "output_text"
        )?.text ??
        (resp as any)?.output?.[0]?.content?.find?.(
          (c: any) => c.type === "output_json"
        )?.json;
      if (typeof parsed === "string") {
        try {
          data = JSON.parse(parsed);
        } catch {}
      } else if (parsed && typeof parsed === "object") {
        data = parsed;
      }
    }

    // 6) 파싱 실패시 최소 응답 보장
    if (!data || typeof data !== "object") {
      data = {
        reply:
          (typeof txt === "string" && txt.trim()) ||
          "요청을 처리했지만 결과 구조화를 하지 못했어요.",
        cards: [],
        checklist: [],
      };
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("compute error:", err);
    return NextResponse.json(
      {
        reply: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        cards: [],
        checklist: [],
      },
      { status: 500 }
    );
  }
}
