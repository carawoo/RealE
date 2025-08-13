"use client";
import { useState } from "react";

type Msg = { role: "user" | "bot"; text: string };

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: "목표가 무엇인가요? (매매/전세/월세)" }
  ]);
  const [input, setInput] = useState("");

  const send = async () => {
    if (!input.trim()) return;
    const next = [...msgs, { role: "user", text: input }];
    setMsgs(next);
    setInput("");

    // 데모용: /api/compute 호출 (현재는 더미 계산)
    const res = await fetch("/api/compute", {
      method: "POST",
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();

    setMsgs((m) => [...m, { role: "bot", text: data.reply }]);
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
                background: m.role === "user" ? "#eef" : "#f6f6f6"
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
