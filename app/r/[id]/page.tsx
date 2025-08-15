// app/r/[id]/page.tsx
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function SharedPage({ params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from("recommendations")
    .select("payload, created_at")
    .or(`public_id.eq.${params.id},id.eq.${params.id}`) // public_id 또는 기존 id로 접근 허용
    .single();

  if (error || !data) {
    return (
      <main style={{ maxWidth: 880, margin: "40px auto", padding: "0 20px" }}>
        <h2>링크가 유효하지 않아요</h2>
        <p>공유 링크가 삭제되었거나 만료되었을 수 있어요.</p>
      </main>
    );
  }

  const msgs = Array.isArray(data.payload?.msgs) ? data.payload.msgs : [];

  return (
    <main style={{ maxWidth: 880, margin: "24px auto", padding: "0 20px", color: "#e5e7eb", background:"#0f0f23" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "18px 0" }}>공유된 상담</h1>
      <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
        {msgs.map((m: any, i: number) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth:"80%",
            background: m.role === "user" ? "transparent" : "#1f2937",
            border: m.role === "user" ? "1px solid #374151" : "1px solid #374151",
            padding: "12px 14px",
            borderRadius: 12,
            whiteSpace: "pre-wrap"
          }}>
            {m.text}
          </div>
        ))}
      </div>
      <p style={{ marginTop: 16, opacity:.7, fontSize:13 }}>
        생성일: {new Date(data.created_at).toLocaleString("ko-KR")}
      </p>
    </main>
  );
}