"use client";

import { useState } from "react";

const TEST_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID || "price_test123";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: TEST_PRICE_ID,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/checkout?cancelled=1`
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "세션 생성에 실패했습니다");
      }

      const payload = await response.json();
      if (payload?.url) {
        window.location.href = payload.url as string;
      } else {
        throw new Error("결제 페이지 URL이 반환되지 않았습니다");
      }
    } catch (err: any) {
      console.error("Checkout error", err);
      setError(err.message || "결제 세션 생성에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="checkout-surface">
      <header className="checkout-headline">
        <h1>결제 테스트(Stripe)</h1>
        <p>
          PG/카드사 심사용 테스트 페이지입니다. Stripe 결제 테스트 모드로 구성했으며,
          아래 가이드에 따라 결제 모듈을 호출할 수 있습니다.
        </p>
      </header>

      <article className="checkout-card">
        <h2>RealE 상담 패스</h2>
        <span className="checkout-card__price">₩19,900</span>
        <ul className="checkout-card__features">
          <li>AI 상담 무제한 이용</li>
          <li>상담 기록 공유 기능</li>
          <li>프리미엄 정책 요약 제공</li>
        </ul>
        <div className="checkout-buttons">
          <button
            type="button"
            className="nav-btn primary"
            onClick={startCheckout}
            disabled={loading}
          >
            {loading ? "결제 세션 생성 중..." : "Stripe Checkout 열기"}
          </button>
          <a className="nav-btn" href="https://docs.stripe.com/testing" target="_blank" rel="noreferrer">
            Stripe 테스트카드 가이드
          </a>
        </div>
        {error ? <p className="checkout-error">{error}</p> : null}
      </article>

      <section className="checkout-guide">
        <h3>테스트 모드 체크리스트</h3>
        <ol>
          <li>`.env.local`에 `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_STRIPE_TEST_PRICE_ID` 설정</li>
          <li>"Stripe Checkout 열기" 버튼 클릭 → PG 결제창 호출 확인</li>
          <li>카드번호 `4242 4242 4242 4242`, 임의의 만료/ CVC 입력하여 테스트 승인</li>
          <li>결제 완료 후 `/checkout/success` 페이지 도착 및 이메일 알림(Stripe 대시보드) 확인</li>
        </ol>
        <p className="checkout-note">
          ※ Stripe 대시보드 &gt; Developers &gt; Test mode에서 Webhook 이벤트와 결제 승인 기록을 확인할 수 있습니다.
        </p>
      </section>
    </section>
  );
}
