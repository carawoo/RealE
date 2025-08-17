// app/api/compute/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/* ───────── 로컬 유틸 ───────── */
function isLowInfo(text = ""): boolean {
  const s = text.trim();
  if (!s) return true;
  const letters = s.replace(/[\s\p{P}\p{S}\p{Emoji_Presentation}]/gu, "");
  return letters.length < 2;
}
function isRealEstateQuery(text = ""): boolean {
  const t = text.toLowerCase();
  const kw = [
    "전세","월세","매매","주담대","담보대출","보금자리","디딤돌","특례",
    "ltv","dti","dsr","등기","잔금","계약금","중도금","취득세","등기부",
    "대출","금리","상환","원리금","거치","만기","갈아타기","리파이낸싱",
    "시세","아파트","빌라","오피스텔","주거비","rir","환산","환산액","월세환산",
    "월소득","소득","현금","보유현금"
  ];
  return kw.some(k => t.includes(k));
}
function isAnalyticalTopic(text = ""): boolean {
  const t = text.toLowerCase();
  const k = [
    "체증식","체증","원리금균등","원금균등","상환 방식","상환방식",
    "거치","만기일시","혼합형","변동금리","고정금리",
    "ltv","dsr","dti","한도","금리 비교","갈아타기","리파이낸싱"
  ];
  if (k.some(x => t.includes(x))) return true;
  if (/\b(5|10|15|20|30)\s*년/.test(t) && /(상환|원리금|체증|만기)/.test(t)) return true;
  if (/\b\d+(\.\d+)?\s*%/.test(t) && /(금리|상환|dsr|ltv)/.test(t)) return true;
  return false;
}
function isVerifyIntentServer(text = ""): boolean {
  const t = text.toLowerCase();
  return (
    /(사실|팩트|검증|근거|출처|공식|수식|근거\s*출처|증명|rir|주거비\s*30)/.test(t) ||
    /(verify|evidence|proof|source|citation|formula)/i.test(text)
  );
}
function isMetaFollowUpServer(text = ""): boolean {
  const t = text.toLowerCase();
  return (
    /(의도|요약|정리|한\s*줄|다시|재계산|업데이트|수정|보완|이어|계속|앞서|위\s*판단|동일\s*조건|같은\s*조건|맥락|컨텍스트|얼마였지|얼마라고\s*했지|내가\s*말한|말했던|숫자만|콤마)/.test(t) ||
    /(summary|summarize|tl;dr|update|recompute|recalculate|follow\s*up|continue)/i.test(text)
  );
}
function isRecallNumbersAsk(text = ""): boolean {
  const t = text.toLowerCase();
  return /(월소득|소득).*(현금)|현금.*(월소득|소득)|내가\s*말한|말했던/.test(t) && /(숫자만|콤마)/.test(t);
}

// 한글 금액 파서
function parseWon(s = ""): number {
  const clean = s.replace(/\s+/g, "");
  let n = 0;
  const mEok = /(\d+(?:\.\d+)?)억/.exec(clean);
  if (mEok) n += Math.round(parseFloat(mEok[1]) * 1e8);
  const mCheon = /(\d+(?:\.\d+)?)천/.exec(clean);
  if (mCheon) n += Math.round(parseFloat(mCheon[1]) * 1e7);
  const mMan = /(\d+(?:\.\d+)?)만/.exec(clean);
  if (mMan) n += Math.round(parseFloat(mMan[1]) * 1e4);
  const mRaw = /(\d{1,3}(?:,\d{3})+|\d+)/.exec(clean);
  if (mRaw) n = Math.max(n, parseInt(mRaw[1].replace(/,/g, ""), 10));
  return n;
}

type Card = { title: string; subtitle?: string; monthly?: string; totalInterest?: string; notes?: string[] };
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchRecentMessages(conversationId?: string | null, limit = 12) {
  if (!conversationId || !process.env.SUPABASE_SERVICE_ROLE) return [];
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data.map((m: any) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || ""),
  }));
}

function extractIncomeCashFromHistory(history: {role: string; content: string}[]) {
  let income: number | undefined;
  let cash: number | undefined;
  for (const h of history) {
    if (h.role !== "user") continue;
    const t = h.content.toLowerCase();
    const mi = /(세후\s*)?(월\s*소득|월급|소득)[^0-9억천만]*([0-9,억천만\s]+)/i.exec(t);
    if (mi) income = parseWon(mi[3]);
    const mc = /(보유\s*현금|가용\s*현금|현금)[^0-9억천만]*([0-9,억천만\s]+)/i.exec(t);
    if (mc) cash = parseWon(mc[2]);
  }
  return { income, cash };
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userText: string = String(body?.message ?? "").trim();
    let intent: "summary" | "verify" | undefined = body?.intent;
    const conversationId: string | undefined = body?.conversationId;

    if (!userText) return NextResponse.json({ reply: "메시지가 비었어요." }, { status: 400 });
    if (isLowInfo(userText)) {
      return NextResponse.json({
        intentSummary: "상황 상세 요청",
        reply: "어떤 상황인지 자세히 말씀해 주시면 상황에 맞춰 도움을 드릴게요!",
        cards: [], checklist: [], nextSteps: [],
      });
    }

    if (!intent && isMetaFollowUpServer(userText)) intent = "summary";
    if (!intent && isVerifyIntentServer(userText)) intent = "verify";

    // (1) 숫자만 회상 질의는 LLM 우회
    if (isRecallNumbersAsk(userText)) {
      const history = await fetchRecentMessages(conversationId, 30);
      const { income, cash } = extractIncomeCashFromHistory(history);
      if (income || cash) {
        const parts: string[] = [];
        if (income) parts.push(income.toLocaleString());
        if (cash) parts.push(cash.toLocaleString());
        return NextResponse.json({
          intentSummary: "메모리 값(월소득/현금) 재확인",
          reply: parts.join(", "),
          cards: [], checklist: [], nextSteps: [],
        });
      }
    }

    // (2) 도메인 가드 (요약/검증은 우회)
    const allowDomainSkip = intent === "summary" || intent === "verify";
    if (!allowDomainSkip && !isRealEstateQuery(userText)) {
      return NextResponse.json({
        intentSummary: "비도메인 문의",
        reply:
          "이 서비스는 ‘부동산/주택금융’ 상담 전용이에요 🙂\n" +
          "예) 전세 vs 매매, LTV/DSR 한도, 특례보금자리 요건/금리, 월세↔보증금 조정 등",
        cards: [], checklist: [], nextSteps: [],
      });
    }

    // (3) 컨텍스트 + 시스템 프롬프트
    const history = await fetchRecentMessages(conversationId, 12);
    const needsAnalysis = isAnalyticalTopic(userText);
    const sysParts: string[] = [
      "너는 한국 ‘부동산(매매/전세/월세)’ 상담사야.",
      "초보도 이해할 쉬운 말로 설명하고, 반드시 아래 JSON ‘한 덩어리’만 출력해.",
      'JSON: {"intentSummary": string, "reply": string, "cards": Card[], "checklist": string[], "nextSteps": string[]}',
      "Card: {title, subtitle?, monthly?, totalInterest?, notes?[]}",
      needsAnalysis
        ? "상환방식/금리유형/LTV·DSR 등 분석 이슈면: 상황 요약→옵션 장단점→(가능하면) 간단 예시 계산으로 월 상환액 비교. '사실 검증 체크리스트'를 덧붙여."
        : "규정/절차는 간결히, 필요 시 체크리스트로 정돈.",
      // ▶ 다음 단계(행동) 지시
      "또한 사용자가 바로 실행할 수 있는 'nextSteps'(3~6개)를 작성해. 예: (1) 은행 앱/창구에서 사전심사(Pre-Approval) 진행, (2) 보금자리론/디딤돌 공사·은행 공식 사이트에서 조건 확인 및 신청, (3) 중개사와 매물 확인 및 계약금(통상 10%) 일정·자금 계획 수립, (4) 잔금대출/등기 일정 조율, (5) 전입+확정일자 등 보호절차 등. 과도한 링크 남발은 피하되, 고유명은 명시.",
      intent === "summary"
        ? "지금 요청은 메타/요약/업데이트 성격. intentSummary에 ‘한 줄 요약’을 반드시 채워라. 숫자만 요구하면 숫자만, 금액은 한국형 콤마."
        : "각 응답마다 intentSummary를 한 문장으로 채워라. 금액은 한국형 콤마.",
      intent === "verify"
        ? "사용자가 방금 계산의 근거/공식/출처를 요구했다. (1) 사용한 가정·수식·계산 단계를 짧게, (2) RIR 30% 기준 설명, (3) 공신력 있는 한국 기관(국토교통부/한국은행/금융감독원/주택도시기금/통계청 등) 2~3개 URL을 reply 말미에 '출처:' 줄로 명시. URL을 그대로 써라."
        : "",
      "출력은 JSON 한 덩어리만. 코드펜스/설명 금지."
    ];

    const contextPrefix =
      history.length > 0
        ? "이전 대화 요약(모형 참고용): " +
          history.map(h => `${h.role === "assistant" ? "A" : "U"}: ${h.content}`).join(" | ")
        : "이전 대화 없음.";

    const userPrompt =
      `사용자 입력: """${userText}"""\n\n` +
      `${contextPrefix}\n` +
      (intent === "summary"
        ? "- 지금까지 대화를 고려해 의도요약 1줄 + 필요한 경우 간단 보완/재계산만 해. 숫자만 요구하면 숫자만."
        : intent === "verify"
        ? "- 방금 답변의 근거/공식/출처 제시. 수식은 간단히, 링크는 2~3개로."
        : "- cards는 0~3개, 체크리스트는 핵심만. nextSteps는 3~6개.");

    const comp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sysParts.join(" ") },
        ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: userPrompt },
      ],
    });

    const raw = comp.choices?.[0]?.message?.content ?? "{}";
    const parsed = (() => {
      try {
        const trimmed = String(raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
        return JSON.parse(trimmed);
      } catch { return {}; }
    })() as { intentSummary?: string; reply?: string; cards?: Card[]; checklist?: string[]; nextSteps?: string[] };

    const intentSummary = typeof parsed?.intentSummary === "string" ? parsed.intentSummary.trim() : "";
    const reply =
      typeof parsed?.reply === "string"
        ? parsed.reply
        : "요청을 이해했어요. 조금 더 구체적으로 알려주시면 계산을 도와드릴게요!";
    const cards: Card[] = Array.isArray(parsed?.cards) ? parsed.cards! : [];
    const checklist: string[] = Array.isArray(parsed?.checklist) ? parsed.checklist! : [];
    const nextSteps: string[] = Array.isArray(parsed?.nextSteps) ? parsed.nextSteps! : [];

    if (process.env.LOG_TO_SUPABASE === "1" &&
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE) {
      try {
        await supabaseAdmin.from("recommendations").insert({
          input_text: userText,
          reply, cards, checklist,
          payload_json: { userText, intent, historyLen: history.length, nextSteps },
        });
      } catch {}
    }

    return NextResponse.json({ intentSummary, reply, cards, checklist, nextSteps });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { reply: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}