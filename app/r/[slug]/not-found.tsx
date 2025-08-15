// app/r/[slug]/not-found.tsx
export default function NotFound() {
  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h2>링크를 찾을 수 없어요</h2>
      <p>만료되었거나 잘못된 주소일 수 있어요. 새 상담을 시작해 주세요.</p>
      <a href="/chat">지금 상담 시작</a>
    </main>
  );
}