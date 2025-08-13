"use client";
import { useState } from "react";

type Role = "user" | "bot";
type Msg = { role: Role; text: string };

export default function Chat() {
  // 상태에 제네릭 명시
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: "목표가 무엇인가요? (매매/전세/월세)" },
  ]);
  const [input, setInput] = useState("");

  const send = async () => {
    if (!input.trim()) return;

    // next를 Msg[]로 명시하거나 role 리터럴에 as const
    const next: Msg[] = [...msgs, { role: "user", text: input }];
    setMsgs(next);
    setInput("");

    const res = await fetch("/api/compute", {
      method: "POST",
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();

    // 여기서도 타입을 보장
    setMsgs((m) => [...m, { role: "bot", text: String(data.reply ?? "") }]);
  };

  return (
    <main style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h2>채팅</h2>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, minHeight: 300 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ margin: "8px 0", textAlign: m.role === "user" ? "right" : "left" }}>
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 12,
                background: m.role === "user" ? "#eef" : "#f6f6f6",
              }}
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요"
          style={{ flex: 1, padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <button onClick={send} style={{ padding: "10px 16px", borderRadius: 8 }}>전송</button>
      </div>
    </main>
  );
}
