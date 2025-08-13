// app/r/[id]/page.tsx
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("recommendations")
    .select("payload_json")
    .eq("public_id", params.id)
    .single();

  if (error || !data) {
    return (
      <main style={{ padding: 24 }}>
        <h2>결과를 찾을 수 없습니다.</h2>
      </main>
    );
  }

  const p = data.payload_json as any;

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto", color: "#111" }}>
      <h1 style={{ marginBottom: 8 }}>추천 결과</h1>
      <p style={{ marginBottom: 24, color: "#444" }}>{p.summary}</p>

      <div style={{ display: "grid", gap: 12 }}>
        {p.cards?.map((c: any) => (
          <div key={c.key} style={{
            border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff"
          }}>
            <div style={{ fontWeight: 600 }}>{c.title}</div>
            <div style={{ color: "#666", fontSize: 14 }}>{c.subtitle}</div>
            <div style={{ marginTop: 8, fontSize: 18 }}>{c.monthly}</div>
            <div style={{ color: "#444" }}>{c.totalInterest}</div>
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {c.notes?.map((n: string, i: number) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {p.docChecklist?.length ? (
        <>
          <h2 style={{ marginTop: 24 }}>서류 체크리스트(재직 1년 미만)</h2>
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {p.docChecklist.map((d: string, i: number) => <li key={i}>{d}</li>)}
          </ul>
        </>
      ) : null}
    </main>
  );
}
