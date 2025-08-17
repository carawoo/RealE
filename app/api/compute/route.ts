// app/api/compute/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ── 로컬 유틸 ───────────────────────────────────────────────
// 저품질 방어
function isLowInfo(text: string): boolean {
  const s = (text ?? "").trim();
  if (!s) return true;
  const letters = s.replace(/[\s\p{P}\p{S}\p{Emoji_Presentation}]/gu, "");
  return letters.length < 2;
}

// 도메인 감지
function isRealEstateQuery(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  const kw = [
    "전세","월세","매매","주담대","담보대출","보금자리","디딤돌","특례",
    "ltv","dti","dsr","등기","잔금","계약금","중도금","취득세","등기부",
    "대출","금리","상환","원리금","거치","만기","갈아타기","시세","아파트","빌라","오피스텔"
  ];
  return kw.some(k => t.includes(k));
}

// 분석형 주제
function isAnalyticalTopic(text: string): boolean {
  const t = (text ?? "").toLowerCase();
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

// 메모리 숫자 회상 질의(숫자만/콤마/내 월소득/보유현금…)
function isRecallNumbersQuery(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  return /(숫자만|콤마|,만|, 포함|숫자만\s*답|얼마|월소득|소득|현금)/.test(t);
}

// 안전 JSON 파서
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

// 금액 파서(“2억 5천”, “380만”, “1,200,000”)
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

function extractMoneyInputsFromText(text = ""): { incomeMonthly?: number; cashOnHand?: number } {
  const t = text.toLowerCase();
  const income = (() => {
    const m = /(월\s*소득|세후\s*월소득|소득|수입)\s*([0-9,억천만\s]+)/.exec(t);
    return m ? parseWon(m[2]) : undefined;
  })();
  const cash = (() => {
    const m = /(보유\s*현금|현금|가용\s*현금)\s*([0-9,억천만\s]+)/.exec(t);
    return m ? parseWon(m[2]) : undefined;
  })();
  return { incomeMonthly: income, cashOnHand: cash };
}

type Card = { title: string; subtitle?: string; monthly?: string; totalInterest?: string; notes?: string[] };

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 최근 N개 불러오기(메모리) ───────────────────────────────
async function fetchRecentMessages(conversationId?: string | null, limit = 16) {
  if (!conversationId || !process.env.SUPABASE_SERVICE_ROLE) return [];
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("role, content, fields, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data.map((m: any) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || ""),
    fields: m.fields || null,
  }));
}

// 히스토리에서 월소득/현금 복원
function restoreMoneyFromHistory(history: Array<{ content: string; fields?: any }>) {
  let income: number | undefined;
  let cash: number | undefined;

  for (const h of history) {
    if (h.fields && typeof h.fields === "object") {
      if (typeof h.fields.incomeMonthly === "number") income = h.fields.incomeMonthly;
      if (typeof h.fields.cashOnHand === "number") cash = h.fields.cashOnHand;
    }
    // 텍스트에서도 한 번 더 시도(안전망)
    const ex = extractMoneyInputsFromText(h.content || "");
    if (!income && ex.incomeMonthly) income = ex.incomeMonthly;
    if (!cash && ex.cashOnHand) cash = ex.cashOnHand;
  }
  return { incomeMonthly: income, cashOnHand: cash };
}

// ── 라우트 ─────────────────────────────────────────────────
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userText: string = String(body?.message ?? "").trim();
    const intent: "summary" | "verify" | undefined = body?.intent;
    const conversationId: string | undefined = body?.conversationId;

    // 0) 가드
    if (!userText) {
      return NextResponse.json({ reply: "메시지가 비었어요." }, { status: 400 });
    }
    if (isLowInfo(userText)) {
      return NextResponse.json({
        intentSummary: "상황 상세 요청",
        reply: "어떤 상황인지 자세히 말씀해 주시면 상황에 맞춰 도움을 드릴게요!",
        cards: [],
        checklist: [],
      });
    }

    // 메모리 로드(최근 대화)
    const history = await fetchRecentMessages(conversationId, 16);

    // 1) 숫자만 회상 질의면 → 도메인가드 우회 + 즉시 응답
    if (isRecallNumbersQuery(userText)) {
      const { incomeMonthly, cashOnHand } = restoreMoneyFromHistory(history as any);
      if (incomeMonthly && cashOnHand) {
        const a = Number(incomeMonthly).toLocaleString();
        const b = Number(cashOnHand).toLocaleString();
        return NextResponse.json({
          intentSummary: "메모리 확인(월소득/현금)",
          reply: `${a} / ${b}`, // 숫자만
          cards: [],
          checklist: [],
        });
      }
      // 값이 없으면 안내(빈 문자열 금지)
      return NextResponse.json({
        intentSummary: "메모리 미발견",
        reply: "최근 대화에서 월소득/현금 정보를 찾지 못했어요. 예: ‘상황 업데이트: 월소득 380만원, 현금 1200만원’ 처럼 알려주세요.",
        cards: [],
        checklist: [],
      });
    }

    // 메타 요약 의도일 때는 도메인 가드 우회
    const allowDomainSkip = intent === "summary" || intent === "verify";
    if (!allowDomainSkip && !isRealEstateQuery(userText)) {
      return NextResponse.json({
        intentSummary: "비도메인 문의",
        reply:
          "이 서비스는 ‘부동산/주택금융’ 상담 전용이에요 🙂\n" +
          "예) 전세 vs 매매, LTV/DSR 한도, 특례보금자리 요건/금리, 월세↔보증금 조정 등",
        cards: [],
        checklist: [],
      });
    }

    // 2) 시스템 프롬프트
    const needsAnalysis = isAnalyticalTopic(userText);
    const sysPieces = [
      "너는 한국 ‘부동산(매매/전세/월세)’ 상담사야.",
      "초보도 이해할 쉬운 말로 설명하고, 반드시 아래 JSON ‘한 덩어리’만 출력해.",
      "JSON 스키마: {\"intentSummary\": string, \"reply\": string, \"cards\": Card[], \"checklist\": string[], \"sources\"?: {name:string,url:string}[]}",
      "Card: {title, subtitle?, monthly?, totalInterest?, notes?[]}",
      needsAnalysis
        ? "상환방식(체증식·원리금균등·원금균등) 또는 금리유형(고정·변동·혼합), LTV/DSR/거치/만기 비교가 포함되면: 사용자의 상황 요약 → 각 옵션의 장단점/적합 케이스 → (가능하면) 간단 예시 계산으로 월 상환액 비교까지 제시."
        : "사실관계·규정·절차는 최신 상식에 맞게 간결히 정리하고, 필요 시 체크리스트로 정돈.",
      intent === "summary"
        ? "지금 요청은 ‘의도요약/정리/업데이트/재계산’ 성격이야. 반드시 intentSummary에 한 줄 요약을 채워라."
        : "각 응답마다 intentSummary에 사용자의 의도를 한 문장으로 요약해 채워라.",
      intent === "verify"
        ? "사용자가 ‘근거/출처/검증’을 요구했어. 계산 근거와 공식·가정 요약을 reply에 포함하고, sources 배열에 2~4개의 신뢰 가능한 한국 공공/금융기관 출처(name,url)를 적어."
        : "",
      "금액 표기는 한국형 천단위 콤마(예: 1,234,567원).",
      "출력은 JSON 한 덩어리만. 서술형 텍스트(코드펜스/설명) 금지.",
    ];

    const userPrompt =
      `사용자 입력: """${userText}"""\n` +
      (history.length
        ? "이전 대화 요약(참고): " +
          history.map(h => `${h.role === "assistant" ? "A" : "U"}: ${h.content}`).join(" | ")
        : "이전 대화 없음.") +
      (intent === "summary" ? "\n- 의도요약 1줄만 우선 포함." : "\n- cards 0~3개, checklist 핵심만.");

    // 3) 모델 호출
    const comp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sysPieces.join(" ") },
        ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: userPrompt },
      ],
    });

    const raw = comp.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeJson<{
      intentSummary?: string;
      reply?: string;
      cards?: Card[];
      checklist?: string[];
      sources?: { name: string; url: string }[];
    }>(raw);

    const intentSummary =
      typeof parsed?.intentSummary === "string" ? parsed.intentSummary.trim() : "";
    const reply =
      typeof parsed?.reply === "string" && parsed.reply.trim()
        ? parsed.reply
        : "요청을 이해했어요. 조금 더 구체적으로 알려주시면 계산을 도와드릴게요!";
    const cards: Card[] = Array.isArray(parsed?.cards) ? parsed.cards! : [];
    const checklist: string[] = Array.isArray(parsed?.checklist) ? parsed.checklist! : [];

    // (옵션) 로그 저장
    if (process.env.LOG_TO_SUPABASE === "1" &&
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE) {
      try {
        await supabaseAdmin.from("recommendations").insert({
          input_text: userText,
          reply, cards, checklist,
          payload_json: { userText, intent, historyLen: history.length, sources: parsed?.sources ?? [] },
        });
      } catch { /* noop */ }
    }

    return NextResponse.json({ intentSummary, reply, cards, checklist, sources: parsed?.sources ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { reply: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}