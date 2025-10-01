// app/fortune/[slug]/not-found.tsx

import Link from "next/link";
import "./share.css";

export default function NotFound() {
  return (
    <main className="fortune-share-wrap">
      <div className="fortune-share-error">
        <h1>🔮 사주를 찾을 수 없습니다</h1>
        <p>
          공유된 부동산 사주가 만료되었거나 존재하지 않습니다.
          <br />
          새로운 사주를 확인해보세요!
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem" }}>
          <Link href="/chat" className="btn primary">
            사주 보러가기
          </Link>
          <Link href="/" className="btn" style={{ background: "white", color: "#667eea", border: "2px solid #667eea" }}>
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}

