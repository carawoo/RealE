import Link from "next/link";
import "../global.css";

export const metadata = {
  title: "RealE Plus 구독 상품 - RealE",
  description: "RealE Plus 구독으로 무제한 부동산 상담을 받아보세요"
};

export default function ProductPage() {
  return (
    <main className="page-container">
      <div className="surface" style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
        <header className="home-hero">
          <h1>RealE Plus 구독 상품</h1>
          <p>전문가 수준의 부동산 상담을 무제한으로 받아보세요</p>
        </header>

        <div className="product-details" style={{ marginTop: "40px" }}>
          <div className="product-card" style={{ 
            border: "1px solid #e0e0e0", 
            borderRadius: "12px", 
            padding: "30px", 
            marginBottom: "30px",
            backgroundColor: "#f9f9f9"
          }}>
            <h2 style={{ color: "#2563eb", marginBottom: "20px" }}>RealE Plus</h2>
            <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
              월 3,900원
            </div>
            
            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ marginBottom: "15px" }}>포함된 서비스</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                  <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                  일일 30회 무제한 질문
                </li>
                <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                  <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                  정부 지원 대출 프로그램 자동 매칭
                </li>
                <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                  <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                  프리랜서 소득 증명 방법 상담
                </li>
                <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                  <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                  금융기관 상담 연결 서비스
                </li>
                <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                  <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                  실제 사용자 경험담 기반 조언
                </li>
                <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                  <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                  대화 공유 및 저장 기능
                </li>
              </ul>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ marginBottom: "15px" }}>상품 상세 정보</h3>
              <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
                <p><strong>상품명:</strong> RealE Plus 월간 구독</p>
                <p><strong>가격:</strong> 3,900원 (월간)</p>
                <p><strong>결제 방식:</strong> 카카오페이, 신용카드</p>
                <p><strong>구독 기간:</strong> 30일 (자동 갱신)</p>
                <p><strong>해지:</strong> 언제든지 해지 가능</p>
                <p><strong>환불:</strong> 7일 이내 무조건 환불</p>
              </div>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ marginBottom: "15px" }}>이용 방법</h3>
              <ol style={{ paddingLeft: "20px" }}>
                <li style={{ marginBottom: "10px" }}>RealE Plus 구독하기 버튼 클릭</li>
                <li style={{ marginBottom: "10px" }}>카카오페이 또는 신용카드로 결제</li>
                <li style={{ marginBottom: "10px" }}>즉시 무제한 상담 서비스 이용 가능</li>
                <li style={{ marginBottom: "10px" }}>매월 자동 갱신 (해지 시까지)</li>
              </ol>
            </div>

            <div style={{ textAlign: "center" }}>
              <Link 
                href="/checkout/info" 
                className="btn primary"
                style={{ 
                  display: "inline-block", 
                  padding: "15px 30px", 
                  fontSize: "18px",
                  textDecoration: "none"
                }}
              >
                RealE Plus 구독하기
              </Link>
            </div>
          </div>

          <div style={{ 
            backgroundColor: "#f0f9ff", 
            padding: "20px", 
            borderRadius: "8px", 
            border: "1px solid #0ea5e9",
            marginBottom: "30px"
          }}>
            <h3 style={{ color: "#0c4a6e", marginBottom: "15px" }}>무료 체험</h3>
            <p style={{ margin: 0, color: "#0c4a6e" }}>
              신규 가입 시 5회 무료 질문을 제공합니다. 
              서비스를 체험해보신 후 구독을 결정하세요!
            </p>
          </div>

          <div style={{ 
            backgroundColor: "#fef3c7", 
            padding: "20px", 
            borderRadius: "8px", 
            border: "1px solid #f59e0b",
            marginBottom: "30px"
          }}>
            <h3 style={{ color: "#92400e", marginBottom: "15px" }}>주의사항</h3>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#92400e" }}>
              <li>구독 해지는 마이페이지에서 언제든지 가능합니다</li>
              <li>결제일 기준 7일 이내 무조건 환불 가능합니다</li>
              <li>서비스 이용 중 문제가 있으시면 고객센터로 문의해주세요</li>
            </ul>
          </div>
        </div>

        <footer style={{ 
          marginTop: "60px", 
          paddingTop: "20px", 
          borderTop: "1px solid #e0e0e0",
          textAlign: "center",
          color: "#666"
        }}>
          <p>© 2025 RealE. All rights reserved.</p>
          <p>사업자등록번호: 123-45-67890 | 대표: 김리얼</p>
          <p>경기도 안산시 단원구 광덕2로 17, 1316동 304호(초지동, 그린빌주공13단지아파트)</p>
          <p>고객센터: 1588-0000 | 이메일: support@real-e.space</p>
        </footer>
      </div>
    </main>
  );
}
