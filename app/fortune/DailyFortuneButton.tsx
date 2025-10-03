// app/fortune/DailyFortuneButton.tsx
// 오늘의 운세 버튼 컴포넌트

"use client";

import { useState } from "react";
import DailyFortuneModal from "./DailyFortuneModal";
import "./fortune.css";

interface DailyFortuneButtonProps {
  buttonClassName?: string;
  buttonText?: string;
  showIcon?: boolean;
}

export default function DailyFortuneButton({
  buttonClassName = "fortune-btn primary",
  buttonText = "오늘의 운세 보기",
  showIcon = true
}: DailyFortuneButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        className={buttonClassName}
        onClick={handleClick}
        type="button"
      >
        {showIcon && "🔮 "}
        {buttonText}
      </button>

      {isModalOpen && (
        <DailyFortuneModal
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
