// app/api/compute/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase"; // 경로 유지

// ────────────────────────────────────────────────────────────
// 로컬 유틸 (서버에서만 쓰는 가드/파서)
// 클라이언트 코드에 의존하지 않도록 여기서 재정의합니다.
// ────────────────────────────────────────────────────────────
function isLowInfo(text: string): boolean {
  const s = (text ?? "").trim();
  if (!s) return true;
  // 공백/구두점/이모지 제거 후 글자 수 체크
  const letters = s.replace(/[\s\p{P}\p{S}\p{Emoji_Presentation}]/gu, "");
  return letters.length < 2;
}

function isRealEstateQuery(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  const kw = [
    "전세", "월세", "매매", "주담대", "담보대출", "보금자리", "디딤돌", "특례",
    "ltv", "dti", "dsr", "등기", "잔금", "계약금", "중도금", "취득세", "등기부",
    "대출", "금리", "상환", "원리금", "거치", "만기", "갈아타기"
  ];
  return kw.some(k => t.includes(k));
}

// ‘FAQ로 퉁치는 게 아니라’ 맥락 분석이 필요한 주제들
function isAnalyticalTopic(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  const keywords = [
    "체증식", "체증", "원리금균등", "원금균등", "상환 방식", "상환방식",
    "거치", "만기일시", "혼합형", "변동금리", "고정금리",
    "ltv", "dsr", "dti", "한도", "금리 비교", "갈아타기", "리파이낸싱"
  ];
  if (keywords.some(k => t.includes(k))) return true;
  if (/\b(5|10|15|20|30)\s*년/.test(t) && /(상환|원리금|체증|만기)/.test(t)) return true;
  if (/\b\d+(\.\d+)?\s*%/.test(t) && /(금리|상환|dsr|ltv)/.test(t)) return true;
  return false;
}

// 모델이 코드펜스/잡문을 섞어도 안전하게 JSON만 뽑는 파서
function safeJson<T = any>(str: string): T {
  try {
    const trimmed = String(str || "")
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "");
    return JSON.parse(trimmed) as T;
  } catch {
    return {} as T;
  }
}

// 카드 타입 (클라이언트와 스키마 맞춤)
type Card = {
  title: string;
  subtitle?: string;
  monthly?: string;
  totalInterest?: string;
  notes?: string[];
};

// OpenAI 클라이언트
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ────────────────────────────────────────────────────────────
// POST /api/compute
// 클라이언트에서 전송한 message를 받아 모델 호출 → JSON 구조로 응답
// ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userText = String(body?.message ?? "").trim();

    // 0) 방어적 가드
    if (!userText) {
      return NextResponse.json(
        { reply: "메시지가 비었어요." },
        { status: 400 }
      );
    }
    if (isLowInfo(userText)) {
      return NextResponse.json({
        reply: "어떤 상황인지 자세히 말씀해 주시면 상황에 맞춰 도움을 드릴게요!",
        cards: [],
        checklist: [],
      });
    }
    if (!isRealEstateQuery(userText)) {
      return NextResponse.json({
        reply:
          "이 서비스는 ‘부동산/주택금융’ 상담 전용이에요 🙂\n" +
          "예) 전세 vs 매매, LTV/DSR 한도, 특례보금자리 요건/금리, 월세↔보증금 조정 등",
        cards: [],
        checklist: [],
      });
    }

    // 1) 시스템 프롬프트 (상환/금리 등 분석 주제는 더 자세히 요구)
    const needsAnalysis = isAnalyticalTopic(userText);
    const system =
      [
        "너는 한국 ‘부동산(매매/전세/월세)’ 상담사야.",
        "초보도 이해할 쉬운 말로 설명하고, 반드시 아래 JSON ‘한 덩어리’만 출력해.",
        "JSON 스키마: {\"reply\": string, \"cards\": Card[], \"checklist\": string[]}",
        "Card: {title, subtitle?, monthly?, totalInterest?, notes?[]}",
        needsAnalysis
          ? "질문에 상환방식(체증식·원리금균등·원금균등) 또는 금리유형(고정·변동·혼합), LTV/DSR/거치/만기 비교가 포함되면: 사용자의 상황 요약 → 각 옵션의 장단점/적합 케이스 → (가능하면) 간단 예시 계산으로 월 상환액 비교까지 제시해."
          : "사실관계·규정·절차는 최신 상식에 맞게 간결히 정리하고, 필요 시 체크리스트로 정돈해.",
      ].join(" ");

    const userPrompt =
      `사용자 입력: """${userText}"""\n\n` +
      "- 출력은 JSON 한 덩어리만. 서술형 텍스트(설명/인사/코드펜스) 금지.\n" +
      "- cards는 0~3개. 체크리스트는 핵심만.\n";

    // 2) 모델 호출
    const comp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" }, // 가능한 경우 JSON 강제
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = comp.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeJson<{ reply?: string; cards?: Card[]; checklist?: string[] }>(raw);

    const reply =
      typeof parsed?.reply === "string"
        ? parsed.reply
        : "요청을 이해했어요. 조금 더 구체적으로 알려주시면 계산을 도와드릴게요!";

    const cards: Card[] = Array.isArray(parsed?.cards) ? parsed.cards! : [];
    const checklist: string[] = Array.isArray(parsed?.checklist) ? parsed.checklist! : [];

    // 3) (옵션) 결과 저장 — 환경변수로 켜고 끕니다.
    //    LOG_TO_SUPABASE=1 일 때만 동작. 스키마는 프로젝트별로 다를 수 있으므로
    //    에러는 조용히 무시합니다.
    if (process.env.LOG_TO_SUPABASE === "1" &&
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE) {
      try {
        await supabaseAdmin
          .from("recommendations")
          .insert({
            input_text: userText,
            reply,
            cards,
            checklist,
            // 프로젝트 스키마에 맞춰 자유롭게: payload_json, meta 등
            payload_json: { userText, needsAnalysis },
          });
      } catch (e) {
        // 스키마가 다르면 실패할 수 있으니 로깅만
        console.error("Supabase insert skipped:", e);
      }
    }

    // 4) 응답
    return NextResponse.json({ reply, cards, checklist });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { reply: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}