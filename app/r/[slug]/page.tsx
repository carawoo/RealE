// app/r/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Role = "user" | "assistant";
type Card = { title: string; subtitle?: string; monthly?: string; totalInterest?: string; notes?: string[] };
type Msg  = { role: Role; text?: string; cards?: Card[]; checklist?: string[] };

export const revalidate = 0; // 공유 링크는 즉시 반영

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export default async function SharedPage({ params: { slug } }: { params: { slug: string } }) {
  // 환경변수(브라우저로 노출 가능한 anon 키/URL)
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, anon);

  // 1) 실행 전: 쿼리빌더 구성 (아직 실행 X)
  const base = supabase
    .from("recommendations")
    .select("payload_json, payload, created_at")
    .limit(1);

  // 2) slug 유형별 필터 부착
  const query =
    isUuid(slug)      ? base.eq("public_id", slug) :
    /^\d+$/.test(slug) ? base.eq("id", Number(slug)) :
    null;

  if (!query) return notFound();

  // 3) 실제 실행
  const { data, error } = await query.maybeSingle();

  // 4) 가드 및 디버그 로그
  if (error) {
    console.error("[/r/[slug]] select error:", error);
    return notFound();
  }
  if (!data) {
    console.warn("[/r/[slug]] no row for slug:", slug);
    return notFound();
  }

  // payload_json(신규) 또는 payload(이전 컬럼) 중 있는 쪽 사용
  const payload = (data as any).payload_json ?? (data as any).payload;
  const msgs: Msg[] = Array.isArray(payload) ? payload : [];

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>공유된 대화</h1>
        <Link href="/" className="btn">홈으로</Link>
      </header>

      {msgs.length === 0 ? (
        <p style={{ marginTop: 24 }}>표시할 메시지가 없어요.</p>
      ) : (
        <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
          {msgs.map((m, i) => (
            <section key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {m.role === "user" ? "🙋 사용자" : "🤖 RealE"}
              </div>

              {m.text && <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>}

              {Array.isArray(m.cards) && m.cards.length > 0 && (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {m.cards.map((c, ci) => (
                    <div key={ci} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10 }}>
                      <div style={{ fontWeight: 600 }}>{c.title}</div>
                      {c.subtitle && <div>{c.subtitle}</div>}
                      {c.monthly && <div style={{ fontSize: 18 }}>{c.monthly}</div>}
                      {c.totalInterest && <div>{c.totalInterest}</div>}
                      {Array.isArray(c.notes) && c.notes.length > 0 && (
                        <ul style={{ marginTop: 6 }}>
                          {c.notes.map((n, ni) => <li key={ni}>{n}</li>)}
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