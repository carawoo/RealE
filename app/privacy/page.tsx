"use client";

import Link from "next/link";
import "../global.css";

export default function PrivacyPolicyPage() {
  return (
    <section className="page-container">
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
          <h2>8. 개인정보 처리방침의 변경</h2>
          <p>
            법령 또는 서비스 정책의 변경 시, 회사는 본 개인정보 처리방침을 수정할 수 있으며 변경사항은 홈페이지 공지사항을 통해 안내합니다.
          </p>
        </section>

        <p className="privacy-updated">공고일자: 2025-09-27 / 시행일자: 2025-09-27</p>
        <p className="privacy-back">
          <Link href="/">홈으로 돌아가기</Link>
        </p>
      </article>
    </section>
  );
}
