// lib/rules.ts
export type MoneyInputs = {
    incomeMonthly?: number;   // 세후 월소득(원)
    monthlyRent?: number;     // 월세(원)
    deposit?: number;         // 보증금(원)
    cashOnHand?: number;      // 보유현금(원)
  };
  
  // 간단 한국어 금액 파서: "2억 5천", "800만", "1,200,000" 등 일부 패턴만 커버
  export function parseWon(s = ""): number {
    const clean = s.replace(/\s+/g, "");
    let n = 0;
  
    const mEok = /(\d+(?:\.\d+)?)억/.exec(clean);
    if (mEok) n += Math.round(parseFloat(mEok[1]) * 1e8);
  
    const mCheon = /(\d+(?:\.\d+)?)천/.exec(clean);
    if (mCheon) n += Math.round(parseFloat(mCheon[1]) * 1e7);
  
    const mMan = /(\d+(?:\.\d+)?)만/.exec(clean);
    if (mMan) n += Math.round(parseFloat(mMan[1]) * 1e4);
  
    // 숫자만 있을 때(쉼표 포함)
    const mRaw = /(\d{1,3}(?:,\d{3})+|\d+)/.exec(clean);
    if (mRaw) n = Math.max(n, parseInt(mRaw[1].replace(/,/g, ""), 10));
  
    return n;
  }
  
  // 메시지에서 대충 값 뽑기(있으면 사용, 없으면 undefined)
  export function extractMoneyInputsFromText(text: string): MoneyInputs {
    const t = text.toLowerCase();
  
    const monthlyRent = (() => {
      const m = /(월세|월\s*세)\s*([0-9,억천만\s]+)/.exec(t);
      return m ? parseWon(m[2]) : undefined;
    })();
  
    const deposit = (() => {
      const m = /(보증금|보증\s*금)\s*([0-9,억천만\s]+)/.exec(t);
      return m ? parseWon(m[2]) : undefined;
    })();
  
    const incomeMonthly = (() => {
      const m = /(월(소득|수입)|소득|수입)\s*([0-9,억천만\s]+)/.exec(t);
      return m ? parseWon(m[3]) : undefined;
    })();
  
    const cashOnHand = (() => {
      const m = /(현금|보유\s*현금|가용\s*현금)\s*([0-9,억천만\s]+)/.exec(t);
      return m ? parseWon(m[2]) : undefined;
    })();
  
    return { monthlyRent, deposit, incomeMonthly, cashOnHand };
  }
  
  // (공식 환산식) 임대차 환산액 = 보증금 + (월세 × 100)
  // *일부 지자체는 합산액 5천만 미만이면 ×70을 적용. 여기선 보수적으로 ×100 사용.
  export function convertedPriceForRent(deposit = 0, monthlyRent = 0): number {
    return deposit + monthlyRent * 100;
  }
  
  // (요율 상한 근사) 임대차 중개보수 상한 추정치
  // - 0.3% (≤5천만), 0.4% (5천만~2억), 0.5% (2억~6억), 0.6% (6억~9억), 0.8% (≥9억, 상한액 존재)
  // 지자체/거래구간에 따라 상한액(만원 단위 캡)이 있지만, 여기선 근사치로 계산.
  export function estimateBrokerFeeUpper(total: number): number {
    if (total <= 50_000_000) return total * 0.003;
    if (total <= 200_000_000) return total * 0.004;
    if (total <= 600_000_000) return total * 0.005;
    if (total <= 900_000_000) return total * 0.006;
    return total * 0.008; // ≥9억
  }
  
  export function computeRentWarnings(i: MoneyInputs): { warnings: string[]; facts: string[] } {
    const warnings: string[] = [];
    const facts: string[] = [];
  
    // 1) RIR(주거비 부담률) 경고
    if (i.incomeMonthly && i.monthlyRent) {
      const rir = i.monthlyRent / i.incomeMonthly;
      facts.push(`월세/월소득 = ${(rir * 100).toFixed(1)}%`);
      if (rir > 0.30) {
        warnings.push(
          `월세가 월소득의 ${(rir * 100).toFixed(0)}%로 **30% 기준**을 넘어요. ` +
          `RIR 30% 초과는 '주거비 과부담'으로 분류됩니다.`
        );
      }
    }
  
    // 2) 초기비용 대비 현금 경고(보수적 추정)
    if (i.monthlyRent && i.deposit && i.cashOnHand) {
      const conv = convertedPriceForRent(i.deposit, i.monthlyRent);
      const broker = estimateBrokerFeeUpper(conv);
      // 이사/설치비 보수 추정(지역/상황 따라 20~60만, 여기선 40만)
      const moving = 400_000;
      const upfront = Math.round(broker + i.monthlyRent + moving);
  
      facts.push(
        `초기비용(중개보수 상한 근사 + 1개월 월세 + 이사/설치비) ≈ ${upfront.toLocaleString()}원`
      );
  
      if (i.cashOnHand < upfront) {
        warnings.push(
          `보유현금이 초기비용 추정치(${upfront.toLocaleString()}원)보다 적어요. ` +
          `계약/이사 비용을 반영해 현금 여력을 확인해 보세요.`
        );
      }
    }
  
    return { warnings, facts };
  }