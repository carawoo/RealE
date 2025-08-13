import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>RealE MVP</h1>
      <p>내 경제 상황 기반 대출/정책 추천 – 채팅형 데모</p>
      <p><Link href="/chat">채팅 시작하기 →</Link></p>
    </main>
  );
}
