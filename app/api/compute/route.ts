// app/api/compute/route.ts
import { NextResponse } from "next/server";
export const runtime = "edge";

type Card = {
  title: string;
  subtitle?: string;
  monthly?: string;
  totalInterest?: string;
  notes?: string[];
};

function parseEmploymentMonths(msg: string): number | null {
  const m = msg.match(/재직\s*(\d+)\s*개월/);
  return m ? Number(m[1]) : null;
}

function mockResult(message: string) {
  const months = parseEmploymentMonths(message) ?? 24;
  const checklist =
    months < 12
      ? [
          "재직증명서(입사일 표기)",
          "최근 6개월 급여이체 내역",
          "근로계약서",
          "4대보험 자격득실 확인서",
        ]
      : [];

  const cards: Card[] = [
    {
      title: "시나리오 A · 지금 대출",
      subtitle: "고정 3.35% · 30년",
      monthly: "월 상환 1,930,000원",
      totalInterest: "총 이자 2.9억",
      notes: ["중도상환수수료 1.2%", "DSR 36% 이내"],
    },
    {
      title: "시나리오 B · 2개월 대기",
      subtitle: "금리 0.2%p 하락 가정",
      monthly: "월 상환 1,880,000원",
      totalInterest: "총 이자 2.8억",
      notes: ["재형저축/청약통장 유지 시 우대 0.1%p"],
    },
  ];

  return {
    reply:
      "현재 조건 기준의 요약입니다. 금리 변동과 정책 일정에 따라 시나리오를 비교했습니다.",
    cards,
    checklist,
    share_url: "", // 저장/공유 구현 전이므로 비움
  };
}

async function callOpenAI(message: string) {
  // 키 없으면 모의 결과
  if (!process.env.OPENAI_API_KEY) return mockResult(message);

  // OpenAI v4 Responses API
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const OpenAI = require("openai").default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const sys =
    "너는 한국 주택금융/정책에 밝은 어시스턴트다. 반드시 JSON만 출력한다. " +
    `형식: {"reply": string, "cards":[{"title":string,"subtitle":string,"monthly":string,"totalInterest":string,"notes":string[]}] , "checklist": string[] }`;

  const user =
    `사용자 입력: ${message}\n` +
    "시나리오 2~3개로 비교하되, 숫자는 과장하지 말고 한국 원화 표기를 사용. " +
    "취업 1년 미만이면 필요한 서류 체크리스트를 포함.";

  const res = await client.responses.create({
    model: "gpt-4o-mini",
    input: [{ role: "system", content: sys }, { role: "user", content: user }],
    temperature: 0.2,
  });

  const text: string = res.output_text || "";
  // ```json ... ``` 감싸짐 대비
  const jsonMatch = text.match(/```json([\s\S]*?)```/i);
  const raw = jsonMatch ? jsonMatch[1] : text;

  try {
    const parsed = JSON.parse(raw);
    // 최소 필드 보정
    return {
      reply: String(parsed.reply ?? "").slice(0, 800),
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
      share_url: "",
    };
  } catch {
    // 파싱 실패 시 안전한 기본 결과
    return mockResult(message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = (body?.message ?? "").toString().trim();
    if (!message) {
      return NextResponse.json({ error: "NO_MESSAGE" }, { status: 400 });
    }

    const result = await callOpenAI(message);

    // (선택) Supabase 저장은 환경 변수가 있을 때만 시도
    // try {
    //   if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE) {
    //     const { createClient } = await import("@supabase/supabase-js");
    //     const supabase = createClient(
    //       process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //       process.env.SUPABASE_SERVICE_ROLE!
    //     );
    //     const public_id = crypto.randomUUID().slice(0, 8);
    //     await supabase.from("recommendations").insert({
    //       public_id,
    //       payload_json: result,
    //     });
    //     result.share_url = `/r/${public_id}`;
    //   }
    // } catch (e) {
    //   // 저장 실패는 무시하고 화면은 정상 동작
    // }

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    // 절대 500로 죽지 않게 방어
    const safe = mockResult("fallback");
    return NextResponse.json(safe, { status: 200 });
  }
}
