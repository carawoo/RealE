// app/api/compute/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// vercel 캐시 방지
export const dynamic = "force-dynamic";

// 아주 가벼운 관련성 판별(모델 호출 전)
function isHousingRelated(t: string) {
  const kw = [
    "매매","전세","월세","전월세","보증금","대출","금리","LTV","DTI","DSR",
    "디딤돌","보금자리","특례","주금공","주택금융공사","HUG","청약","아파트",
    "상환","체증","고정","변동","전환","중도상환","등기","전세사기","부동산","집"
  ];
  const s = t.toLowerCase();
  return kw.some(k => s.includes(k));
}

export async function POST(req: Request) {
  try {
    // 0) 안전 파싱
    const body = await req.json().catch(() => ({} as any));
    const raw = (body?.message ?? "").toString().trim();

    // 1) 너무 짧거나 인사/잡담 → 즉시 가이드(모델 호출 X)
    const isTooShort = raw.length < 2;
    const isNoise = /^[\s.?!~ㅎㅎㅋㄷㄱㅠㅠㅜㅜ…!]+$/i.test(raw);
    const isGreeting = /^(안녕|안뇽|하이|헬로|hello|hi|ㅎㅇ|반가워|굿모닝|굿애프터눈)/i.test(raw);
    if (isTooShort || isNoise || isGreeting) {
      return NextResponse.json(
        {
          reply:
            "안녕하세요! 😊 부동산 상담을 도와드릴게요.\n\n아래처럼 한 줄로 적어주시면 바로 계산해 드려요.\n- 예) \"매매, 예산 6억, 보유 8천, 연소득 4500, 수도권, 30년, 체증식 선호\"\n- 예) \"전세, 보증금 3억, 월세 90, 수도권, 회사까지 1시간 이내\"\n\n그냥 편하게 상황을 말해도 괜찮아요. 핵심 정보를 제가 뽑아 정리해 드릴게요!",
          cards: [],
          checklist: [],
        },
        { status: 200 }
      );
    }

    // 2) 오프토픽 대비: 관련성 플래그
    const offTopic = !isHousingRelated(raw);

    // 3) JSON 스키마(프론트 호환)
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

    // 4) 시스템/유저 프롬프트
    const system =
      "너는 한국의 부동산/대출 도우미다. 초보자도 이해하기 쉽게 쉬운 말로 설명한다. " +
      "가능하면 카드 2~3개로 '지금 실행 vs 기다리기' 등 비교를 제안한다. " +
      "월세는 보증금이 100만원 미만이면 먼저 확인 요청을 reply에 포함한다. " +
      "정책/상품은 자주 바뀌니 불확실한 값은 추정임을 명시하고, 다음 행동 1~2개를 제시한다. " +
      "만약 사용자의 내용이 부동산과 무관하다면: 먼저 그 주제에 대해 1~2문장으로 짧게 친절히 도움을 준 뒤, " +
      "우리 서비스의 범위(부동산 대출/전월세/매매)로 자연스럽게 안내하라. 이때 cards는 비워도 된다.";

    const user =
      `사용자 입력(관련성=${offTopic ? "낮음" : "높음"}):\n${raw}\n\n` +
      "반환은 JSON만. 문자열은 모두 한국어. 카드가 없으면 cards는 빈 배열.\n";

    // 5) 모델 호출 (SDK 타입 충돌 방지를 위해 any 사용)
    const reqBody: any = {
      model: "gpt-4o-mini",
      input: [system, user].join("\n\n"),
      response_format: { type: "json_schema", json_schema: schema },
    };
    const resp = await openai.responses.create(reqBody);

    // 6) 출력 회수(여러 케이스 방어)
    const txt =
      (resp as any).output_text ??
      (resp as any)?.choices?.[0]?.message?.content ??
      "";

    let data: any = null;

    if (typeof txt === "string") {
      try { data = JSON.parse(txt); } catch { /* ignore */ }
    }
    if (!data) {
      const parsed =
        (resp as any)?.output?.[0]?.content?.find?.((c: any) => c.type === "output_json")?.json ??
        (resp as any)?.output?.[0]?.content?.find?.((c: any) => c.type === "output_text")?.text;
      if (typeof parsed === "string") { try { data = JSON.parse(parsed); } catch { /* ignore */ } }
      else if (parsed && typeof parsed === "object") { data = parsed; }
    }

    // 7) 최소 응답 보장
    if (!data || typeof data !== "object") {
      data = { reply: String(txt || "설명을 준비했지만 구조화에 실패했어요."), cards: [], checklist: [] };
    }
    if (!Array.isArray(data.cards)) data.cards = [];
    if (!Array.isArray(data.checklist)) data.checklist = [];

    // 8) 오프토픽이면 예시 카드 추가(사용자 안내 강화를 위해)
    if (offTopic && data.cards.length === 0) {
      data.cards.push({
        title: "이렇게 물어보시면 바로 계산해 드려요",
        subtitle: "예시 질문",
        notes: [
          "매매, 예산 6억, 보유 8천, 연소득 4500, 수도권, 30년, 체증식 선호",
          "전세, 보증금 3억, 월세 90, 서울 송파, 회사까지 1시간 이내",
          "월세, 보증금 2000, 월 90, 경기도, 반려동물 가능, 보증금 100만 이상"
        ],
      });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("compute error:", err);
    return NextResponse.json(
      {
        reply:
          "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. 계속 되면 입력을 한 줄로 요약해서 보내 주세요.",
        cards: [],
        checklist: [],
      },
      { status: 500 }
    );
  }
}
