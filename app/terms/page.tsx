import Link from "next/link";
import "./terms.css";

export default function TermsPage() {
  return (
    <div className="terms-container">
      <div className="terms-header">
        <Link href="/checkout" className="back-button">
          ← 결제 페이지로 돌아가기
        </Link>
        <h1>RealE 구독 서비스 운영 규정</h1>
        <p className="last-updated">최종 수정일: 2025년 10월 14일</p>
      </div>

      <div className="terms-content">
        <section className="terms-section">
          <h2>제1조 (목적)</h2>
          <p>
            본 운영 규정은 뚝딱컴퍼니(이하 "회사")가 제공하는 RealE 구독 서비스의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항, 서비스 이용조건 및 절차 등을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="terms-section">
          <h2>제2조 (구독 서비스 안내)</h2>
          <div className="subsection">
            <h3>1. RealE Plus 월간 구독</h3>
            <ul>
              <li>월 이용료: 3,900원</li>
              <li>일일 질문 한도: 30회</li>
              <li>구독 기간: 30일 (결제일 기준)</li>
            </ul>
          </div>
          <div className="subsection">
            <h3>2. RealE Pro 월간 구독</h3>
            <ul>
              <li>월 이용료: 5,000원</li>
              <li>일일 질문 한도: 50회</li>
              <li>구독 기간: 30일 (결제일 기준)</li>
            </ul>
          </div>
        </section>

        <section className="terms-section important">
          <h2>제3조 (환불 및 청약 철회)</h2>
          <div className="subsection">
            <h3>1. 디지털 콘텐츠의 특성</h3>
            <p>
              RealE는 AI 기반 부동산 상담 서비스로서, 전자상거래법상 디지털 콘텐츠에 해당합니다. 디지털 콘텐츠는 구매와 동시에 서비스가 제공되는 특성상 <strong className="highlight">아래 조건에 해당하는 경우를 제외하고는 환불이 제한됩니다.</strong>
            </p>
          </div>

          <div className="subsection">
            <h3>2. 환불 가능한 경우</h3>
            <ul className="refund-list">
              <li>
                <strong>결제 후 서비스를 전혀 이용하지 않은 경우</strong>
                <ul>
                  <li>결제일로부터 7일 이내</li>
                  <li>AI 상담 기능을 1회도 사용하지 않은 경우</li>
                  <li>전액 환불 가능</li>
                </ul>
              </li>
              <li>
                <strong>서비스에 중대한 오류가 있는 경우</strong>
                <ul>
                  <li>기술적 문제로 서비스 이용이 불가능한 경우</li>
                  <li>공지된 서비스 내용과 실제 제공 내용이 현저히 다른 경우</li>
                  <li>잔여 기간에 대해 일할 계산하여 환불</li>
                </ul>
              </li>
              <li>
                <strong>회사의 귀책사유로 서비스가 제공되지 않은 경우</strong>
                <ul>
                  <li>서비스 중단 기간에 대해 일할 계산하여 환불</li>
                </ul>
              </li>
            </ul>
          </div>

          <div className="subsection">
            <h3>3. 환불이 제한되는 경우</h3>
            <ul className="no-refund-list">
              <li>
                <strong>서비스를 1회 이상 이용한 경우</strong>
                <p className="explanation">
                  AI 상담 기능을 사용하여 답변을 받은 경우, 디지털 콘텐츠의 제공이 완료된 것으로 간주되어 환불이 불가능합니다.
                </p>
              </li>
              <li>
                <strong>구독 기간 중 단순 변심에 의한 해지</strong>
                <p className="explanation">
                  이용자의 단순 변심으로 구독을 해지하는 경우, 이미 제공된 서비스에 대해서는 환불이 불가능합니다.
                </p>
              </li>
              <li>
                <strong>이용자의 귀책사유로 서비스 이용이 제한된 경우</strong>
                <p className="explanation">
                  운영 정책 위반, 부정 사용 등 이용자의 귀책사유로 서비스 이용이 정지 또는 제한된 경우 환불이 불가능합니다.
                </p>
              </li>
            </ul>
          </div>

          <div className="subsection">
            <h3>4. 중도 해지 시 정산</h3>
            <p>
              구독 기간 중 해지하는 경우, 아래와 같이 정산됩니다:
            </p>
            <ul>
              <li>서비스를 이용하지 않은 경우: 7일 이내 전액 환불</li>
              <li>서비스를 이용한 경우: 
                <ul>
                  <li>이용 기간에 대한 비용은 환불 불가</li>
                  <li>잔여 기간에 대한 환불은 불가 (월 단위 결제 상품 특성상)</li>
                </ul>
              </li>
            </ul>
            <div className="example-box">
              <strong>예시:</strong>
              <p>10월 1일에 RealE Plus(3,900원)를 구독한 후, 10월 15일에 해지를 요청하는 경우</p>
              <ul>
                <li>서비스를 1회라도 이용한 경우: 환불 불가 (디지털 콘텐츠 특성상)</li>
                <li>서비스를 전혀 이용하지 않은 경우: 10월 8일까지는 전액 환불 가능, 이후는 환불 불가</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="terms-section">
          <h2>제4조 (환불 처리 절차)</h2>
          <div className="subsection">
            <h3>1. 환불 신청</h3>
            <ul>
              <li>이메일: 2025reale@gmail.com</li>
              <li>필수 제공 정보: 주문번호, 결제일, 환불 사유</li>
            </ul>
          </div>
          <div className="subsection">
            <h3>2. 환불 처리</h3>
            <ul>
              <li>검토 기간: 영업일 기준 1-3일</li>
              <li>환불 처리 기간: 승인 후 영업일 기준 3-5일</li>
              <li>환불 방법: 결제 수단과 동일한 방법으로 환불</li>
            </ul>
          </div>
        </section>

        <section className="terms-section">
          <h2>제5조 (이용 제한)</h2>
          <p>다음 각 호에 해당하는 경우 서비스 이용이 제한될 수 있으며, 환불이 불가능합니다:</p>
          <ul>
            <li>타인의 정보를 도용하여 서비스를 이용한 경우</li>
            <li>서비스를 상업적 목적으로 무단 사용하는 경우</li>
            <li>시스템에 무리를 주는 과도한 요청을 하는 경우</li>
            <li>법령 또는 본 약관을 위반한 경우</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>제6조 (개인정보 처리)</h2>
          <p>
            회사는 구독 서비스 제공을 위해 최소한의 개인정보를 수집합니다. 자세한 내용은 <Link href="/privacy" className="link">개인정보처리방침</Link>을 참조하시기 바랍니다.
          </p>
        </section>

        <section className="terms-section">
          <h2>제7조 (고객센터)</h2>
          <ul>
            <li>이메일: 2025reale@gmail.com</li>
            <li>운영시간: 평일 09:00 - 18:00 (주말 및 공휴일 휴무)</li>
            <li>응답 시간: 영업일 기준 24시간 이내</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>제8조 (사업자 정보)</h2>
          <ul>
            <li>이메일: 2025reale@gmail.com</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>제9조 (약관의 변경)</h2>
          <p>
            회사는 필요한 경우 본 약관을 변경할 수 있으며, 변경 시 시행일 7일 전에 공지합니다. 변경된 약관은 공지 후 시행일부터 효력이 발생합니다.
          </p>
        </section>

        <div className="terms-notice">
          <h3>⚠️ 중요 안내</h3>
          <p>
            RealE는 디지털 콘텐츠 서비스로서, 서비스 이용 즉시 콘텐츠가 제공됩니다. 
            따라서 <strong>서비스를 이용한 후에는 환불이 제한</strong>되는 점 유의하시기 바랍니다.
          </p>
          <p>
            구독 전에 무료 체험 버전으로 서비스를 충분히 테스트해보신 후 결제하시기를 권장합니다.
          </p>
        </div>
      </div>

      <div className="terms-footer">
        <Link href="/checkout" className="agree-button">
          약관에 동의하고 결제 진행하기
        </Link>
      </div>
    </div>
  );
}

