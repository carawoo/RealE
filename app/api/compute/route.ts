import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

/** ========= 환경 =========
 * OPENAI_API_KEY
 * NEXT_PUBLIC_SUPABASE_URL
 * SUPABASE_ANON_KEY  (읽기 전용이면 ANON으로 충분)
 *  (권장) SUPABASE_SERVICE_ROLE_KEY : 쓰기/배치 용
 */

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)!
      )
    : null;

// ---------- 유틸 ----------
const KR = (n: number) => Math.round(n).toLocaleString("ko-KR");
const safeStr = (v: any) => (v === undefined || v === null ? "" : String(v));

function parseKRW(raw?: string | null): number | null {
  if (!raw) return null;
  const s = raw.replace(/\s/g, "");
  const num = parseFloat(s.replace(/[^\d.]/g, ""));
  if (isNaN(num)) return null;
  if (/억/.test(s)) return Math.round(num * 100_000_000);
  if (/천/.test(s)) return Math.round(num * 10_000_000);
  if (/만/.test(s)) return Math.round(num * 10_000);
  // 단위 미기재: "4500" → 4,500만원으로 가정
  return Math.round(num * 10_000 * 100);
}

function pmt(annualRate: number, months: number, principal: number) {
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  const a = Math.pow(1 + r, months);
  return (principal * r * a) / (a - 1);
}

// 1) 정규식 1차 파싱(빠름)
function extractRegex(message: string) {
  const goal = /매매|전세|월세/i.exec(message)?.[0]?.toLowerCase() || "";
  const years = /(\d+)\s*년/.exec(message)?.[1];
  const termYears = years ? parseInt(years) : undefined;

  const prefer =
    /체증|체증식/.test(message) ? "stepup" :
    /고정|고정금리/.test(message) ? "fixed" :
    /변동|변동금리/.test(message) ? "variable" : "";

  const budgetRaw = /(예산|가격|집값|매물)\s*([0-9\.]+(?:억|천|만)?)/.exec(message)?.[2];
  const cashRaw   = /(보유|자기자본|보증금)\s*([0-9\.]+(?:억|천|만)?)/.exec(message)?.[2];
  const incomeRaw = /(연소득|소득)\s*([0-9\.]+(?:억|천|만)?)/.exec(message)?.[2];

  const region = /(수도권|서울|경기|인천|지방|광역시)/.exec(message)?.[1] || "";

  const parsed = {
    goal,
    termYears,
    prefer,
    budget: parseKRW(budgetRaw || ""),
    cash:   parseKRW(cashRaw   || ""),
    income: parseKRW(incomeRaw || ""),
    region,
  };
  return parsed;
}

// 2) 부족하면 LLM으로 구조화(자유로운 문장 지원)
async function extractWithLLM(message: string) {
  if (!openai) return null;
  const schema = {
    name: "ParsedInput",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        goal: { type: "string", enum: ["매매", "전세", "월세", ""] },
        budget_text: { type: "string" },   // 예: "6억"
        cash_text: { type: "string" },     // 예: "8천"
        income_text: { type: "string" },   // 예: "4500"
        term_years: { type: "integer", minimum: 1, maximum: 40 },
        prefer: { type: "string", enum: ["fixed","variable","stepup",""] },
        region: { type: "string" },
        notes:  { type: "string" }
      },
      required: ["goal","budget_text","cash_text","income_text","term_years","prefer","region","notes"]
    }
  } as const;

  const resp = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      "다음 한국어 사용자의 부동산 관련 자유 문장을 구조화하세요.",
      "가능한 값이 없으면 빈 문자열로 두세요.",
      "term_years는 없으면 30으로 가정하세요.",
      `문장: ${message}`
    ].join("\n"),
    response_format: { type: "json_schema", json_schema: schema }
  });

  const txt = resp.output_text || "{}";
  let j: any = {};
  try { j = JSON.parse(txt); } catch {}
  if (!j || typeof j !== "object") return null;

  return {
    goal: safeStr(j.goal),
    termYears: j.term_years || 30,
    prefer: safeStr(j.prefer),
    budget: parseKRW(j.budget_text),
    cash:   parseKRW(j.cash_text),
    income: parseKRW(j.income_text),
    region: safeStr(j.region)
  };
}

// 정책/금리 요약 가져오기(Supabase에서 최근 것 위주)
async function fetchPolicyNotes(q: { goal?: string; region?: string }) {
  if (!supabase) return [];

  // 가장 최근 정책 6개 가져온 뒤 간단 필터(임시)
  const { data, error } = await supabase
    .from("policies")
    .select("id, source, title, summary, effective_from, url")
    .order("effective_from", { ascending: false })
    .limit(12);

  if (error || !data) return [];

  const keywords = [q.goal || "", q.region || ""].filter(Boolean);
  const filtered = data.filter((row) => {
    if (keywords.length === 0) return true;
    const bag = (row.title || "") + " " + (row.summary || "");
    return keywords.some((k) => bag.includes(k));
  });

  return (filtered.length ? filtered : data).slice(0, 6).map((r) => ({
    title: r.title,
    source: r.source,
    date: r.effective_from,
    summary: r.summary,
    url: r.url
  }));
}

// 계산 카드 만들기
function makeCards(p: {
  goal?: string; termYears?: number; prefer?: string;
  budget?: number | null; cash?: number | null; income?: number | null;
}) {
  const years = p.termYears || 30;
  const months = years * 12;
  const price = p.budget ?? 0;
  let cash = p.cash ?? 0;

  // 요청: 월세는 보증금(보유) 최소 100만원
  if ((p.goal || "").includes("월세")) {
    if (cash < 1_000_000) cash = 1_000_000;
  }

  // 필요 대출
  let need = Math.max(price - cash, 0);
  if ((p.goal || "").includes("매매")) {
    const ltv = 0.8;
    need = Math.min(need, Math.round(price * ltv));
  }

  // 단순 금리 가정(추후 외부 데이터로 교체)
  const rFixed = 0.035, rVar = 0.028, rStep = 0.025;

  const mk = (title: string, r: number, kind: "fixed"|"variable"|"stepup") => {
    const monthly = pmt(r, months, need);
    const totalPaid = monthly * months;
    const totalInterest = Math.max(totalPaid - need, 0);
    const detail =
      kind === "variable" ? ["금리 변동에 따라 월 납입액이 달라질 수 있어요."] :
      kind === "stepup"   ? ["처음에 적게 내고, 시간이 지나며 조금씩 늘어나는 방식이에요."] :
                            ["이자율이 고정이라 매달 비슷하게 내요."];

    return {
      title,
      subtitle:
        kind === "fixed" ? "안정적인 상환 계획" :
        kind === "variable" ? "금리 변동에 따른 리스크" :
        "초기 부담을 낮추는 방법",
      monthly: `${KR(monthly)} 원`,
      totalInterest: `${KR(totalInterest)} 원`,
      notes: [
        `금리: ${(r * 100).toFixed(1)}%`,
        `대출금: ${KR(need)} 원`,
        `상환기간: ${years}년`,
        ...detail
      ]
    };
  };

  return [
    mk("1. 고정금리 대출", rFixed, "fixed"),
    mk("2. 변동금리 대출", rVar, "variable"),
    mk("3. 체증식 대출",   rStep, "stepup"),
  ];
}

export async function POST(req: Request) {
  try {
    const { message } = (await req.json()) as { message?: string };
    const raw = safeStr(message).trim();

    if (!raw) {
      return NextResponse.json(
        { reply: "무엇을 도와드릴까요? 예) 매매, 예산 6억, 보유 8천, 연소득 4500, 수도권, 30년, 체증식 선호" },
        { status: 200 }
      );
    }

    // 1차: 정규식
    let p = extractRegex(raw);

    // 2차: 값이 빈칸이 많으면 LLM으로 보강
    const missing =
      (!p.goal) &&
      (!p.budget && !p.cash) &&
      (!p.termYears);
    if (missing) {
      const llm = await extractWithLLM(raw);
      if (llm) p = { ...p, ...llm };
      if (!p.termYears) p.termYears = 30;
    } else {
      if (!p.termYears) p.termYears = 30;
    }

    const cards = makeCards(p);

    // 정책/금리 요약 (Supabase 테이블 'policies' 기준 최신 6개)
    const policies = await fetchPolicyNotes({ goal: p.goal, region: p.region });

    // 초보자 친화 설명
    const reply =
      [
        "매매를 위해 돈을 빌리거나(혹은 전세/월세를 준비할 때) 크게 세 가지 방식이 있어요.",
        "고정금리는 이자율이 변하지 않아 매달 비슷한 금액을 내요.",
        "변동금리는 금리가 바뀌면 내가 내는 돈도 달라질 수 있어요.",
        "체증식은 처음에 조금 내고, 시간이 지나며 조금씩 더 내는 방식이에요.",
        "",
        `지금 입력하신 내용으로 계산해 보면, 대출금은 대략 ${KR(Math.max((p.budget ?? 0) - (p.cash ?? 0), 0))}원 수준이에요.`,
        p.goal ? `목적: ${p.goal}` : "",
        p.region ? `지역: ${p.region}` : "",
        p.termYears ? `기간: ${p.termYears}년` : "",
        "",
        policies.length
          ? "아래에는 최근 정책/금리 이슈도 함께 담았어요. 실제 신청 전에는 각 기관(은행, 한국주택금융공사, HUG 등)의 최신 공지와 상담 창구에서 꼭 한 번 더 확인해 주세요."
          : "정책 데이터가 아직 등록되지 않았네요. 다음 배치 이후 자동으로 반영되도록 설정해 두는 걸 권장해요."
      ]
        .filter(Boolean)
        .join("\n");

    return NextResponse.json({ reply, cards, policies }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { reply: "서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
