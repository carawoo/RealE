// export default function CheckoutInfoPage() {
//   return (
//     <main className="surface" style={{ maxWidth: 720, margin: "24px auto", padding: 24 }}>
//       <h1 style={{ marginBottom: 12 }}>[결제 안내]</h1>
//       <p style={{ color: "#475569" }}>
//         카카오페이 심사/제휴 진행 중입니다. 심사 완료 전까지는 테스트 결제만 검증하며, 실제 결제는 활성화되어 있지 않습니다.
//       </p>
//       <div style={{ marginTop: 16, lineHeight: 1.7 }}>
//         <p>
//           RealE Plus 요금은 {" "}
//           <strong>3,900원 / 30일</strong> 입니다. 구독 기간 동안 <strong>일일 30회</strong>까지 질문할 수 있으며, 더 필요하면
//           <strong> 2025reale@gmail.com</strong> 으로 연락 주시면 한도를 늘려 드립니다.
//         </p>
//         <p>
//           심사 완료 즉시 결제 페이지로 이동하도록 업데이트됩니다. 테스트 결제를 원하시면 개발팀에 문의해 주세요.
//         </p>
//       </div>
//       <a className="nav-btn" href="/chat" style={{ display: "inline-block", marginTop: 16 }}>
//         상담으로 돌아가기
//       </a>
//     </main>
//   );
// }

// 결제 기능 임시 비활성화
export default function CheckoutInfoPage() {
  return (
    <main className="surface" style={{ maxWidth: 720, margin: "24px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>결제 안내</h1>
      <p style={{ color: "#475569" }}>
        결제 기능은 현재 준비 중입니다.
      </p>
      <a className="nav-btn" href="/chat" style={{ display: "inline-block", marginTop: 16 }}>
        상담으로 돌아가기
      </a>
    </main>
  );
}


