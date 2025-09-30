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


          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr 1fr", 
            gap: "20px", 
            marginBottom: "40px" 
          }}>
            {/* 무료 플랜 */}
            <div className="product-card" style={{ 
              border: "1px solid #e0e0e0", 
              borderRadius: "12px", 
              padding: "30px", 
              backgroundColor: "#f8f9fa",
              textAlign: "center",
              position: "relative"
            }}>
              <h3 style={{ color: "#6b7280", marginBottom: "20px" }}>무료 체험</h3>
              <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px", color: "#10b981" }}>
                무료
              </div>
              
              <div style={{ marginBottom: "30px" }}>
                <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
                  <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                    <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                    일일 5회 질문
                  </li>
                  <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                    <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                    기본 부동산 상담
                  </li>
                  <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                    <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                    정책 프로그램 안내
                  </li>
                  <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                    <span style={{ color: "#ef4444", marginRight: "8px" }}>✗</span>
                    프리랜서 소득 증명 상담
                  </li>
                  <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                    <span style={{ color: "#ef4444", marginRight: "8px" }}>✗</span>
                    금융기관 상담 연결
                  </li>
                  <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                    <span style={{ color: "#ef4444", marginRight: "8px" }}>✗</span>
                    대화 공유 및 저장
                  </li>
                </ul>
              </div>

              <div style={{ textAlign: "center" }}>
                <button 
                  className="btn"
                  style={{ 
                    display: "inline-block", 
                    padding: "15px 30px", 
                    fontSize: "16px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    width: "100%"
                  }}
                  disabled
                >
                  현재 이용 중
                </button>
              </div>
            </div>
            {/* RealE Plus 플랜 */}
            <div className="product-card" style={{ 
              border: "2px solid #2563eb", 
              borderRadius: "12px", 
              padding: "30px", 
              backgroundColor: "#f0f9ff",
              textAlign: "center",
              position: "relative"
            }}>
              <div style={{
                position: "absolute",
                top: "-10px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#2563eb",
                color: "white",
                padding: "5px 15px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold"
              }}>
                추천
              </div>
              
              <h3 style={{ color: "#2563eb", marginBottom: "20px" }}>RealE Plus</h3>
              <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
                월 3,900원
              </div>
              
              <div style={{ marginBottom: "30px" }}>
                <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
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

              <div style={{ textAlign: "center" }}>
                <Link 
                  href="/checkout" 
                  className="btn primary"
                  style={{ 
                    display: "inline-block", 
                    padding: "15px 30px", 
                    fontSize: "16px",
                    textDecoration: "none",
                    backgroundColor: "#2563eb",
                    color: "white",
                    borderRadius: "8px",
                    width: "100%",
                    textAlign: "center"
                  }}
                >
                  RealE Plus 구독하기
                </Link>
              </div>
            </div>

            {/* RealE Pro 플랜 */}
            <div className="product-card" style={{ 
              border: "2px solid #059669", 
              borderRadius: "12px", 
              padding: "30px", 
              backgroundColor: "#f0fdf4",
              textAlign: "center",
              position: "relative"
            }}>
              <div style={{
                position: "absolute",
                top: "-10px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#059669",
                color: "white",
                padding: "5px 15px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold"
              }}>
                프리미엄
              </div>
              
              <h3 style={{ color: "#059669", marginBottom: "20px" }}>RealE Pro</h3>
              <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
                월 5,000원
              </div>
              
              <div style={{ marginBottom: "30px" }}>
                <ul style={{ listStyle: "none", padding: 0, textAlign: "left" }}>
                  <li style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
                    <span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>
                    일일 50회 무제한 질문
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

              <div style={{ textAlign: "center" }}>
                <Link 
                  href="/checkout?plan=pro" 
                  className="btn primary"
                  style={{ 
                    display: "inline-block", 
                    padding: "15px 30px", 
                    fontSize: "16px",
                    textDecoration: "none",
                    backgroundColor: "#059669",
                    color: "white",
                    borderRadius: "8px",
                    width: "100%",
                    textAlign: "center"
                  }}
                >
                  RealE Pro 구독하기
                </Link>
              </div>
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

        </div>

      </div>
      
      <style jsx>{`
        @media (max-width: 768px) {
          .product-card {
            margin-bottom: 20px;
          }
          
          .product-card > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
