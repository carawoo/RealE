"use client";

import { useState } from "react";
import Link from "next/link";
import "./checkout.css";

export default function CheckoutPage() {
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "",
    birthDate: "",
    cardPassword: "",
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1-');
    setFormData(prev => ({ ...prev, cardNumber: value }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setFormData(prev => ({ ...prev, expiryDate: value }));
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 6) value = value.slice(0, 6);
    setFormData(prev => ({ ...prev, birthDate: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) value = value.slice(0, 2);
    setFormData(prev => ({ ...prev, cardPassword: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 실제 결제 로직은 카카오페이 심사 완료 후 구현
    alert("카카오페이 심사 진행 중입니다. 실제 결제는 심사 완료 후 가능합니다.");
  };

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <Link href="/product" className="back-button">
          ← 상품 페이지로 돌아가기
        </Link>
        <h1>RealE Plus 구독 결제</h1>
      </div>

      <div className="checkout-content">
        <div className="product-summary">
          <h2>주문 상품</h2>
          <div className="product-item">
            <div className="product-info">
              <h3>RealE Plus 월간 구독</h3>
              <p>일일 30회 무제한 질문 • 정부 지원 대출 프로그램 자동 매칭 • 프리랜서 소득 증명 상담</p>
            </div>
            <div className="product-price">3,900원</div>
          </div>
          <div className="total-price">
            <span>총 결제금액</span>
            <span>3,900원</span>
          </div>
        </div>

        <form className="payment-form" onSubmit={handleSubmit}>
          <h2>카드 정보 입력</h2>
          
          <div className="form-group">
            <label htmlFor="cardNumber">카드번호</label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              placeholder="1234-5678-9012-3456"
              maxLength={19}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expiryDate">유효기간 (MM/YY)</label>
              <input
                type="text"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleExpiryChange}
                placeholder="MM/YY"
                maxLength={5}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="birthDate">생년월일 6자리</label>
              <input
                type="text"
                id="birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleBirthDateChange}
                placeholder="YYMMDD"
                maxLength={6}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cardPassword">카드 비밀번호 앞 두자리</label>
            <input
              type="password"
              id="cardPassword"
              name="cardPassword"
              value={formData.cardPassword}
              onChange={handlePasswordChange}
              placeholder="**"
              maxLength={2}
              required
            />
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
                <span>이용약관 및 개인정보처리방침에 동의합니다 (필수)</span>
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
                  name="agreeMarketing"
                  checked={formData.agreeMarketing}
                  onChange={handleInputChange}
                />
                <span>마케팅 정보 수신에 동의합니다 (선택)</span>
              </label>
            </div>
          </div>

          <button type="submit" className="payment-button">
            정기결제 요청
          </button>
        </form>

        <div className="payment-methods">
          <h3>다른 결제 방법</h3>
          <div className="alternative-payment">
            <div className="kakaopay-option">
              <div className="kakaopay-logo">💳</div>
              <div>
                <h4>카카오페이</h4>
                <p>QR코드 스캔으로 간편 결제</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
