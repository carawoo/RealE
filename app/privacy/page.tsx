"use client";

import Link from "next/link";
import "../global.css";

export default function PrivacyPolicyPage() {
  return (
    <article className="surface privacy-surface">
        <header className="privacy-header">
          <h1>개인정보 처리방침</h1>
          <p>
            RealE(이하 “회사”)는 이용자의 개인정보를 소중히 여기며, 『개인정보 보호법』 등 관련 법령을 준수합니다. 본 처리방침은 회사가 이용자의 개인정보를 어떤 방법으로 수집·이용·보관·파기하는지 안내하기 위한 것입니다.
          </p>
        </header>

        <section className="privacy-section">
          <h2>1. 수집하는 개인정보 항목</h2>
          <p>
            RealE 회원 가입 및 상담 서비스 제공을 위해 아래와 같은 항목을 수집하며, 필수/선택 여부는 앱 내 동의 화면 기준입니다.
          </p>
          <ul>
            <li><strong>필수 수집 항목</strong>: 성별, 연령대, 생일, 상담 이용 기록(대화 내용, 상담 메타데이터)</li>
            <li><strong>선택 수집 항목</strong>: 이름, 출생 연도, 연락처(이메일), 추가로 사용자가 입력한 상담 관련 메모</li>
            <li><strong>자동 수집 항목</strong>: 서비스 이용 로그, 쿠키, 접속 기기/브라우저 정보, IP 주소</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>2. 개인정보의 이용 목적</h2>
          <ul>
            <li>회원 식별 및 서비스 제공, 상담 기록 관리</li>
            <li>부정 이용 방지, 서비스 운영을 위한 통계·분석</li>
            <li>고객 문의 응대, 공지사항 전달</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>3. 개인정보의 보유 및 이용 기간</h2>
          <ul>
            <li>회원 탈퇴 시 즉시 파기 (법령에서 정한 경우 예외)</li>
            <li>상담 기록: 서비스 품질 향상 및 분쟁 대비를 위해 3년간 보관 후 파기</li>
            <li>접속 로그 등 서비스 이용 기록: 3개월 보관 후 파기</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>4. 개인정보의 파기 절차 및 방법</h2>
          <p>
            회사는 보유 기간이 경과한 개인정보를 내부 정책 및 관련 법령에 따라 지체 없이 파기합니다. 전자적 파일 형태는 복구·재생이 불가능한 기술적 방법을 이용하여 삭제하며, 출력물은 분쇄 또는 소각합니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. 개인정보의 제3자 제공 및 처리 위탁</h2>
          <p>
            회사는 이용자의 사전 동의 없이는 개인정보를 외부에 제공하지 않습니다. 다만, 법령에 의한 요청이 있거나 이용자의 동의를 받은 경우, 또는 서비스 제공을 위한 최소한의 범위에서만 처리 위탁을 진행하며, 위탁 현황은 홈페이지에 고지합니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. 이용자 권리</h2>
          <p>
            이용자는 언제든지 등록된 개인정보의 열람·정정·삭제·처리 정지를 요청할 수 있습니다. 요청은 [문의 : <a href="mailto:2025reale@gmail.com">2025reale@gmail.com</a>]을 통해 접수되며, 회사는 지체 없이 조치합니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. 개인정보 보호책임자</h2>
          <p>
            회사는 개인정보 보호를 총괄하는 책임자를 지정하여 이용자의 개인정보를 보호하고, 개인정보와 관련한 불만을 처리합니다.
          </p>
          <ul>
            <li>책임자: RealE 개인정보 보호책임자</li>
            <li>연락처: <a href="mailto:2025reale@gmail.com">2025reale@gmail.com</a></li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>8. 쿠키 및 광고 관련 개인정보 처리</h2>
          <p>
            RealE는 서비스 개선 및 맞춤형 광고 제공을 위해 쿠키를 사용할 수 있습니다. 쿠키 사용에 대한 상세 내용은 다음과 같습니다.
          </p>
          <ul>
            <li><strong>필수 쿠키</strong>: 서비스 기본 기능 제공을 위해 필요한 쿠키</li>
            <li><strong>분석 쿠키</strong>: 서비스 이용 통계 및 개선을 위한 쿠키</li>
            <li><strong>광고 쿠키</strong>: 맞춤형 광고 제공을 위한 쿠키 (선택적)</li>
          </ul>
          <p>
            이용자는 브라우저 설정을 통해 쿠키를 차단하거나 삭제할 수 있으나, 일부 서비스 이용에 제한이 있을 수 있습니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>9. Google AdSense 및 제3자 서비스</h2>
          <p>
            RealE는 Google AdSense를 통한 광고 서비스를 제공할 수 있으며, 이 과정에서 Google의 개인정보 처리방침이 적용됩니다.
          </p>
          <ul>
            <li>Google AdSense: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a></li>
            <li>Google Analytics: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Analytics 개인정보처리방침</a></li>
            <li>카카오 로그인: <a href="https://www.kakao.com/policy/privacy" target="_blank" rel="noopener noreferrer">카카오 개인정보처리방침</a></li>
          </ul>
          <p>
            제3자 서비스 이용 시 해당 서비스의 개인정보 처리방침을 확인하시기 바랍니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>10. 아동 개인정보 보호</h2>
          <p>
            RealE는 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 만 14세 미만 아동이 서비스를 이용하고자 하는 경우, 법정대리인의 동의가 필요합니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>11. 개인정보 처리방침의 변경</h2>
          <p>
            법령 또는 서비스 정책의 변경 시, 회사는 본 개인정보 처리방침을 수정할 수 있으며 변경사항은 홈페이지 공지사항을 통해 안내합니다.
          </p>
          <p>
            중요한 변경사항의 경우 서비스 내 공지 또는 이메일을 통해 별도로 안내드립니다.
          </p>
        </section>

        <section className="privacy-section">
          <h2>12. 개인정보 침해 신고 및 상담</h2>
          <p>
            개인정보 침해 신고나 상담이 필요한 경우 아래 기관에 신고하실 수 있습니다.
          </p>
          <ul>
            <li><strong>개인정보보호위원회</strong>: <a href="https://privacy.go.kr" target="_blank" rel="noopener noreferrer">privacy.go.kr</a> (국번없이 182)</li>
            <li><strong>개인정보 침해신고센터</strong>: <a href="https://privacy.go.kr" target="_blank" rel="noopener noreferrer">privacy.go.kr</a> (국번없이 182)</li>
            <li><strong>대검찰청 사이버범죄수사단</strong>: <a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer">www.spo.go.kr</a> (02-3480-3571)</li>
            <li><strong>경찰청 사이버안전국</strong>: <a href="https://cyberbureau.police.go.kr" target="_blank" rel="noopener noreferrer">cyberbureau.police.go.kr</a> (국번없이 182)</li>
          </ul>
        </section>

        <p className="privacy-updated">공고일자: 2025-01-15 / 시행일자: 2025-01-15</p>
        <p className="privacy-back">
          <Link href="/">홈으로 돌아가기</Link>
        </p>
      </article>
  );
}
