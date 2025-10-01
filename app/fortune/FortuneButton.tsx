"use client";

import { useState } from "react";
import FortuneModal from "./FortuneModal";

interface FortuneButtonProps {
  propertyId: string;
  propertyName: string;
  propertyType?: string;
  propertyPrice?: string;
  propertyAddress?: string;
  buttonText?: string;
  buttonClassName?: string;
}

/**
 * 부동산 사주 보기 버튼
 * 
 * 사용 예시:
 * ```tsx
 * <FortuneButton
 *   propertyId="123"
 *   propertyName="강남역 트리플 스트리트 오피스텔"
 *   propertyType="오피스텔"
 *   propertyPrice="2억 5천만원"
 *   propertyAddress="서울시 강남구 역삼동"
 * />
 * ```
 */
export default function FortuneButton({
  propertyId,
  propertyName,
  propertyType,
  propertyPrice,
  propertyAddress,
  buttonText = "이 집 사주 보기 🔮",
  buttonClassName = "fortune-cta-button",
}: FortuneButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className={buttonClassName}
        onClick={() => setShowModal(true)}
        type="button"
      >
        {buttonText}
      </button>

      {showModal && (
        <FortuneModal
          propertyId={propertyId}
          propertyName={propertyName}
          propertyType={propertyType}
          propertyPrice={propertyPrice}
          propertyAddress={propertyAddress}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

