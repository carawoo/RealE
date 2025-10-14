"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "./checkout.css";

function CheckoutForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  
  const isPro = plan === 'pro';
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    addressDetail: "",
    paymentMethod: "credit",
    agreeTerms: false,
    agreePrivacy: false,
    agreeRefund: false,
    agreeMarketing: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) {
      value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7);
    } else if (value.length > 3) {
      value = value.slice(0, 3) + '-' + value.slice(3);
    }
    setFormData(prev => ({ ...prev, phone: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 약관 동의 확인
    if (!formData.agreeTerms || !formData.agreePrivacy || !formData.agreeRefund) {
      alert("필수 약관에 모두 동의해주세요.");
      return;
    }

    // 실제 결제 로직은 KCP 연동 후 구현
    // 여기서 KCP 결제창을 띄우거나 결제 API를 호출합니다
    alert("결제 대행사(KCP) 연동 후 결제 진행됩니다.\n\n입력하신 정보:\n" + 
          `이름: ${formData.name}\n` +
          `연락처: ${formData.phone}\n` +
          `주소: ${formData.address} ${formData.addressDetail}\n` +
          `결제수단: ${formData.paymentMethod === 'credit' ? '신용카드' : '체크카드'}`);
  };

  return (
    <div className="checkout-container">
        <div className="checkout-header">
          <Link href="/product" className="back-button">
            ← 상품 페이지로 돌아가기
          </Link>
          <h1>{isPro ? 'RealE Pro 구독 결제' : 'RealE Plus 구독 결제'}</h1>
        </div>

      <div className="checkout-content">
        <div className="product-summary">
          <h2>주문 상품</h2>
          <div className="product-item">
            <div className="product-info">
              <h3>{isPro ? 'RealE Pro 월간 구독' : 'RealE Plus 월간 구독'}</h3>
              <p>{isPro ? '일일 50회 무제한 질문 • 정부 지원 대출 프로그램 자동 매칭 • 프리랜서 소득 증명 상담' : '일일 30회 무제한 질문 • 정부 지원 대출 프로그램 자동 매칭 • 프리랜서 소득 증명 상담'}</p>
            </div>
            <div className="product-price">{isPro ? '5,000원' : '3,900원'}</div>
          </div>
          <div className="total-price">
            <span>총 결제금액</span>
            <span>{isPro ? '5,000원' : '3,900원'}</span>
          </div>
        </div>

        <form className="payment-form" onSubmit={handleSubmit}>
          <h2>주문자 정보</h2>
          
          <div className="form-group">
            <label htmlFor="name">성함 (필수)</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="홍길동"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">연락처 (필수)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="010-1234-5678"
              maxLength={13}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">주소 (필수)</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="서울시 강남구 테헤란로 123"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="addressDetail">상세주소</label>
            <input
              type="text"
              id="addressDetail"
              name="addressDetail"
              value={formData.addressDetail}
              onChange={handleInputChange}
              placeholder="101동 101호"
            />
          </div>

          <div className="form-group">
            <label htmlFor="paymentMethod">결제 수단 선택 (필수)</label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="payment-select"
              required
            >
              <option value="credit">신용카드</option>
              <option value="check">체크카드</option>
              <option value="kakaopay">카카오페이</option>
              <option value="naverpay">네이버페이</option>
            </select>
          </div>

          <div className="payment-notice">
            <p>💳 결제 버튼 클릭 시 KCP 결제창이 열립니다.</p>
            <p>선택하신 결제 수단으로 안전하게 결제가 진행됩니다.</p>
          </div>

          <div className="agreement-section">
            <h3>약관 동의</h3>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  required
                />
                <span>
                  <Link href="/terms" target="_blank" className="terms-link">이용약관</Link> 및 <Link href="/privacy" target="_blank" className="terms-link">개인정보처리방침</Link>에 동의합니다 (필수)
                </span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreePrivacy"
                  checked={formData.agreePrivacy}
                  onChange={handleInputChange}
                  required
                />
                <span>개인정보 제3자 제공에 동의합니다 (필수)</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeRefund"
                  checked={formData.agreeRefund}
                  onChange={handleInputChange}
                  required
                />
                <span>
                  <Link href="/terms" target="_blank" className="terms-link">환불 및 구독 운영 규정</Link>을 확인하였으며 이에 동의합니다 (필수)
                </span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeMarketing"
                  checked={formData.agreeMarketing}
                  onChange={handleInputChange}
                />
                <span>마케팅 정보 수신에 동의합니다 (선택)</span>
              </label>
            </div>
          </div>

          <button type="submit" className="payment-button">
            {formData.paymentMethod === 'credit' && '신용카드로 결제하기'}
            {formData.paymentMethod === 'check' && '체크카드로 결제하기'}
            {formData.paymentMethod === 'kakaopay' && '카카오페이로 결제하기'}
            {formData.paymentMethod === 'naverpay' && '네이버페이로 결제하기'}
          </button>
        </form>

        <div className="checkout-footer">
          <div className="footer-notice">
            <p>결제 전 필독사항</p>
            <ul>
              <li>디지털 콘텐츠 특성상 서비스 이용 후 환불이 제한됩니다</li>
              <li>구독 기간 중 해지 시 잔여 기간에 대한 환불은 불가능합니다</li>
              <li>자동 갱신되며, 해지 시 차기 결제일 최소 1일 전까지 신청하셔야 합니다</li>
            </ul>
          </div>
          
          <div className="footer-actions">
            <Link href="/terms" target="_blank" className="terms-button">
              📋 환불 및 구독 운영 규정 자세히 보기
            </Link>
            <Link href="/privacy" target="_blank" className="privacy-button">
              🔒 개인정보처리방침 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
