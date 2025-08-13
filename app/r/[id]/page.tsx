// app/r/[id]/page.tsx
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );

  const { data, error } = await supabase
    .from("recommendations")
    .select("payload_json")
    .eq("public_id", params.id)
    .single();

  if (error || !data) {
    return <main style={{ padding: 24 }}><h2>결과를 찾을 수 없습니다.</h2></main>;
  }

  const p = data.payload_json as any;

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto", color: "#e5e7eb",
                   background:"#0f0f23" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>RealE 추천 시나리오</h1>

      {(p.cards ?? []).map((c: any, i: number) => (
        <section key={i}
          style={{ background:"#1f2937", border:"1px solid #374151", borderRadius:12,
                   padding:16, marginBottom:12 }}>
          <div style={{ fontWeight:600 }}>{c.title}</div>
          {c.subtitle && <div style={{ color:"#9ca3af", fontSize:14 }}>{c.subtitle}</div>}
          {c.monthly && <div style={{ marginTop:8, fontSize:18 }}>{c.monthly}</div>}
          {c.totalInterest && <div>{c.totalInterest}</div>}
          {Array.isArray(c.notes) && (
            <ul style={{ marginTop:8, paddingLeft:18 }}>
              {c.notes.map((n: string, j: number) => <li key={j}>{n}</li>)}
            </ul>
          )}
        </section>
      ))}

      {Array.isArray(p.checklist) && p.checklist.length > 0 && (
        <section style={{ background:"#1f2937", border:"1px solid #374151",
                          borderRadius:12, padding:16, marginTop:12 }}>
          <div style={{ fontWeight:600 }}>서류 체크리스트</div>
          <ul style={{ marginTop:8, paddingLeft:18 }}>
            {p.checklist.map((n: string, j: number) => <li key={j}>{n}</li>)}
          </ul>
        </section>
      )}
    </main>
  );
}
