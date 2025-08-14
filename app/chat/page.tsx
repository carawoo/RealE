'use client';

import React, { useEffect, useRef, useState } from 'react';
import './chat.css';

type Card = {
  title: string;
  subtitle?: string;
  monthly?: string;
  totalInterest?: string;
  notes?: string[];
};

type ApiResp = {
  ok: boolean;
  reply?: string;
  cards?: Card[];
  checklist?: string[];
  share_url?: string;
  error?: string;
};

type Msg =
  | { role: 'user'; text: string }
  | { role: 'assistant'; reply: string; cards: Card[]; checklist: string[] };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(input: string) {
    if (!input.trim() || loading) return;
    setMessages((m) => [...m, { role: 'user', text: input }]);
    setText('');
    setLoading(true);
    try {
      const res = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const data: ApiResp = await res.json();
      if (!data.ok) throw new Error(data.error || '서버 오류');

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          reply: data.reply || '설명 준비 중이에요.',
          cards: data.cards || [],
          checklist: data.checklist || [],
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', reply: `오류: ${e.message}`, cards: [], checklist: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(text);
    }
  }

  const showWelcome = messages.length === 0;

  return (
    <div className="chat-root">
      <div className="messages">
        {showWelcome && <Welcome onPick={send} />}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div className="row me" key={i}>
              <div className="bubble">{m.text}</div>
            </div>
          ) : (
            <div className="row bot" key={i}>
              <div className="bubble">
                <p className="reply">{m.reply}</p>

                {m.cards?.length > 0 && (
                  <div className="cards">
                    {m.cards.map((c, idx) => (
                      <div className="card" key={idx}>
                        <h4>{c.title}</h4>
                        {c.subtitle && <div className="sub">{c.subtitle}</div>}
                        {c.monthly && <div className="money">월 {c.monthly}</div>}
                        {c.totalInterest && (
                          <div className="muted">총 이자: {c.totalInterest}</div>
                        )}
                        {c.notes?.length ? (
                          <ul className="bullets">
                            {c.notes.map((n, j) => (
                              <li key={j}>{n}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {m.checklist?.length > 0 && (
                  <div className="card" style={{ marginTop: 12 }}>
                    <h4>서류 체크리스트</h4>
                    <ul className="bullets">
                      {m.checklist.map((n, j) => (
                        <li key={j}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {loading && (
          <div className="row bot">
            <div className="bubble"><span className="spinner" /> 계산 중입니다…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="inputbar">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="궁금한 점은 언제든 물어보세요!"
          rows={1}
        />
        <button disabled={loading || !text.trim()} onClick={() => send(text)}>
          {loading ? <span className="spinner" /> : '보내기'}
        </button>
      </div>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="welcome">
      <h1>내 집 마련 AI 비서, RealE</h1>
      <p>3분 입력 → 1분 결과. 오늘 내 상황에서 가장 이득인 대출 타이밍을 확인하세요.</p>
      <div className="qopts">
        <button onClick={() => onPick('매매 상담을 받고 싶습니다')}>
          🏠 매매 상담 받기
        </button>
        <button onClick={() => onPick('전세 관련해서 알아보고 있습니다')}>
          🔑 전세 상담 받기
        </button>
        <button onClick={() => onPick('월세 상담 부탁드립니다')}>
          📅 월세 상담 받기
        </button>
      </div>
    </div>
  );
}