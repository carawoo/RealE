// /app/r/[id]/page.tsx
import { supabasePublic } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: { params: { id: string } }) {
  const { data, error } = await supabasePublic
    .from("recommendations")
    .select("reply, cards, checklist, created_at, input_text")
    .eq("public_id", params.id)
    .single();

  if (error || !data) {
    return (
      <main style={{ padding: 24 }}>
        <h2>결과를 찾을 수 없습니다.</h2>
      </main>
    );
  }

  const { reply, cards, checklist, input_text, created_at } = data;

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>RealE 추천 결과</h1>
      <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>
        공유 ID: {params.id} · {new Date(created_at).toLocaleString("ko-KR")}
      </div>

      {input_text && (
        <p style={{ background: "#111827", padding: 12, borderRadius: 8 }}>
          <b>입력:</b> {input_text}
        </p>
      )}

      {reply && (
        <p style={{ background: "#1f2937", padding: 16, borderRadius: 12, marginTop: 16 }}>
          {reply}
        </p>
      )}

      {/* 카드들 */}
      {Array.isArray(cards) && cards.length > 0 && (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {cards.map((c: any, i: number) => (
            <div key={i} style={{ background: "#1f2937", padding: 16, borderRadius: 12, border: "1px solid #374151" }}>
              <div style={{ fontWeight: 700 }}>{c.title}</div>
              <div style={{ color: "#9ca3af", fontSize: 14 }}>{c.subtitle}</div>
              {c.monthly && <div style={{ fontSize: 18, marginTop: 8 }}>{c.monthly}</div>}
              {c.totalInterest && <div>{c.totalInterest}</div>}
              {Array.isArray(c.notes) && (
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {c.notes.map((n: string, j: number) => <li key={j}>{n}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 체크리스트 */}
      {Array.isArray(checklist) && checklist.length > 0 && (
        <div style={{ background: "#1f2937", padding: 16, borderRadius: 12, marginTop: 16, border: "1px solid #374151" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>서류 체크리스트</div>
          <ul style={{ paddingLeft: 20 }}>
            {checklist.map((n: string, i: number) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </main>
  );
}
