// export default function CheckoutSuccessPage() {
//   return (
//     <section className="checkout-surface">
//       <header className="checkout-headline">
//         <h1>결제가 완료되었습니다.</h1>
//         <p>
//           Stripe 테스트 결제가 정상적으로 완료되었습니다. PG/카드사 검수 시 이 페이지가 노출됨을 확인해 주세요.
//         </p>
//       </header>
//       <section className="checkout-card">
//         <h2>다음 단계</h2>
//         <ul className="checkout-card__features">
//           <li>Stripe Dashboard &gt; Payments에서 테스트 승인내역 확인</li>
//           <li>승인 이메일 수신 확인 (Stripe 발송)</li>
//           <li>필요 시 PG/카드사에 결제 흐름 녹화본 전달</li>
//         </ul>
//         <div className="checkout-buttons">
//           <a className="nav-btn primary" href="/chat">
//             상담 서비스 이동
//           </a>
//           <a className="nav-btn" href="/chat">
//             상담으로 돌아가기
//           </a>
//         </div>
//       </section>
//     </section>
//   );
// }

// 결제 기능 임시 비활성화
export default function CheckoutSuccessPage() {
  return (
    <section style={{ maxWidth: 720, margin: "40px auto", padding: 24 }}>
      <h1>결제 페이지</h1>
      <p>결제 기능은 현재 준비 중입니다.</p>
      <a href="/chat" style={{ display: "inline-block", marginTop: 16 }}>상담으로 돌아가기</a>
    </section>
  );
}
