// app/r/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import "./share.css";

type Role = "user" | "assistant";
type Card = { title: string; subtitle?: string; monthly?: string; totalInterest?: string; notes?: string[] };
type Msg = { role: Role; text?: string; content?: string; cards?: Card[]; checklist?: string[] };

type RecommendationRow = {
  payload_json?: Msg[];
  payload?: Msg[];
  created_at?: string | null;
};

export const revalidate = 0;

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** 카드 전용 금액 텍스트 정규화(채팅 페이지와 동일 규칙) */
function formatMoneyishText(s?: string): string {
  if (!s) return "";
  let out = s;
  out = out.replace(/(\d{1,3}),(\d{2})(\s*만)/g, (_m, a, b, unit) => `${a}${b}${unit}`);
  out = out.replace(/(\d{4,})(\s*원)/g, (_m, num, won) => `${Number(num).toLocaleString("ko-KR")}${won}`);
  out = out.replace(/\b(\d{4,})\b/g, (m) => (m.includes(",") ? m : Number(m).toLocaleString("ko-KR")));
  return out;
}

function toKoreanDate(value?: string | null) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default async function SharedPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  console.log("SharedPage called with slug:", slug);
  console.log("Environment check:", {
    NODE_ENV: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error("Missing Supabase environment variables", { url: !!url, anon: !!anon });
    return (
      <main className="share-wrap">
        <header className="share-head">
          <div>
            <h1>환경 설정 문제</h1>
            <p>Supabase 환경 변수가 설정되지 않아 공유된 대화를 불러올 수 없습니다.</p>
          </div>
          <div className="nav-actions">
            <Link href="/" className="btn ghost">
              홈
            </Link>
            <Link href="/chat" className="btn primary">
              지금 상담 시작
            </Link>
          </div>
        </header>
        <p className="meta">Slug: {slug}</p>
        <p className="meta">Environment: {process.env.NODE_ENV}</p>
      </main>
    );
  }

  const supabase = createClient(url, anon);

  // payload 컬럼이 없을 수 있으므로 payload_json만 조회
  const base = supabase.from("recommendations").select("payload_json, created_at, slug").limit(1);

  // 공유 링크는 UUID 슬러그를 사용합니다. 이전 스키마의 public_id가 아닌 slug/id로 조회.
  const query = isUuid(slug)
    ? base.eq("slug", slug)
    : /^\d+$/.test(slug)
    ? base.eq("id", Number(slug))
    : null;
  if (!query) {
    console.error("Invalid slug format", { slug });
    return notFound();
  }

  const { data, error } = await query.maybeSingle<RecommendationRow>();
  if (error) {
    console.error("Supabase query error", { error, slug });
    return notFound();
  }

  if (!data) {
    console.error("No data found for slug", { slug });
    return (
      <main className="share-wrap">
        <header className="share-head">
          <div>
            <h1>공유 링크를 찾을 수 없어요</h1>
            <p>공유된 대화가 만료되었거나 존재하지 않습니다.</p>
          </div>
          <div className="nav-actions">
            <Link href="/" className="btn ghost">
              홈
            </Link>
            <Link href="/chat" className="btn primary">
              지금 상담 시작
            </Link>
          </div>
        </header>
        <p className="meta">Slug: {slug}</p>
      </main>
    );
  }

  const payload = data.payload_json ?? data.payload;
  const msgs: Msg[] = Array.isArray(payload) ? payload : [];

  const rendered = msgs.map((msg) => {
    const text = typeof msg.text === "string" && msg.text.trim().length > 0 ? msg.text : msg.content ?? "";
    return { ...msg, text };
  });

  if (msgs.length === 0) {
    console.warn("Empty messages array for slug", { slug });
  }

  const createdAtText = toKoreanDate(data.created_at);

  return (
    <div className="share-wrap">
      <header className="share-head">
        <div>
          <h1>대화를 공유했어요</h1>
          <p>RealE 상담 기록을 확인하고 필요한 사람과 빠르게 공유하세요.</p>
          {createdAtText && <p className="meta">생성 시각: {createdAtText}</p>}
        </div>
      </header>

      {rendered.length === 0 ? (
        <section className="msg assistant">
          <div className="who">🤖 RealE</div>
          <div className="content">표시할 메시지가 없습니다. 새로운 상담을 시작해 보세요.</div>
        </section>
      ) : (
        <div className="timeline">
          {rendered.map((m, i) => (
            <article key={i} className={`msg ${m.role}`}>
              <div className="who">{m.role === "user" ? "🙋 사용자" : "🤖 RealE"}</div>
              {m.text && <div className="content">{m.text}</div>}

              {Array.isArray(m.cards) && m.cards.length > 0 && (
                <div className="cards">
                  {m.cards.map((c, ci) => (
                    <div key={ci} className="card">
                      <div className="title">{c.title}</div>
                      {c.subtitle && <div className="sub">{formatMoneyishText(c.subtitle)}</div>}
                      {c.monthly && <div className="big">{formatMoneyishText(c.monthly)}</div>}
                      {c.totalInterest && <div className="sub">{formatMoneyishText(c.totalInterest)}</div>}
                      {Array.isArray(c.notes) && c.notes.length > 0 && (
                        <ul>
                          {c.notes.map((n, ni) => (
                            <li key={ni}>{formatMoneyishText(n)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(m.checklist) && m.checklist.length > 0 && (
                <div className="checklist">
                  <div className="ttl">체크리스트</div>
                  <ul>
                    {m.checklist.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <footer className="footer">RealE 상담 기록 공유 뷰</footer>
    </div>
  );
}