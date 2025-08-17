// app/r/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import "./share.css";

type Role = "user" | "assistant";
type Card = { title: string; subtitle?: string; monthly?: string; totalInterest?: string; notes?: string[] };
type Msg = { role: Role; text?: string; cards?: Card[]; checklist?: string[] };

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

export default async function SharedPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon);

  const base = supabase.from("recommendations").select("payload_json, payload, created_at").limit(1);

  const query = isUuid(slug) ? base.eq("public_id", slug) : /^\d+$/.test(slug) ? base.eq("id", Number(slug)) : null;
  if (!query) return notFound();

  const { data, error } = await query.maybeSingle();
  if (error || !data) return notFound();

  const payload = (data as any).payload_json ?? (data as any).payload;
  const msgs: Msg[] = Array.isArray(payload) ? payload : [];

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 20, margin: 10 }}>대화를 공유했어요</h1>
        <Link href="/" className="btn ghost">홈</Link>
      </header>

      {msgs.length === 0 ? (
        <p style={{ marginTop: 24 }}>표시할 메시지가 없어요.</p>
      ) : (
        <div style={{ marginTop: 24, display: "grid", gap: 20 }}>
          {msgs.map((m, i) => (
            <section key={i} style={{ backdropFilter: "blur(10px) saturate(140%)", border: "1px solid rgb(22, 22, 65)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {m.role === "user" ? "🙋 사용자" : "🤖 RealE"}
              </div>
              {m.text && <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>}

              {Array.isArray(m.cards) && m.cards.length > 0 && (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {m.cards.map((c, ci) => (
                    <div key={ci} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10 }}>
                      <div style={{ fontWeight: 600 }}>{c.title}</div>
                      {c.subtitle && <div>{formatMoneyishText(c.subtitle)}</div>}
                      {c.monthly && <div style={{ fontSize: 18 }}>{formatMoneyishText(c.monthly)}</div>}
                      {c.totalInterest && <div>{formatMoneyishText(c.totalInterest)}</div>}
                      {Array.isArray(c.notes) && c.notes.length > 0 && (
                        <ul style={{ marginTop: 6 }}>
                          {c.notes.map((n, ni) => <li key={ni}>{formatMoneyishText(n)}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(m.checklist) && m.checklist.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>체크리스트</div>
                  <ul>{m.checklist.map((n, ni) => <li key={ni}>{n}</li>)}</ul>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}