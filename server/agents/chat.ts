// server/agents/chat.ts
// Direct Mastra usage for chat.
import OpenAI from "openai";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function runChatAgent(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: any
): Promise<string> {
  const systemPrompt = `당신은 대한민국 부동산·금융·인테리어 전문가입니다.

핵심 역할
은행원 겸 대출 전문가: 최신 정부 정책, 규제, 은행권 상품 구조를 정확히 파악하고 사용자 상황에 맞는 대출 전략을 제시합니다.
부동산 전문가: 지역별 시세, 매수·매도 시나리오, 투자·실거주 전략을 실제 사례와 함께 설명합니다.
인테리어 컨설턴트: 거주자의 라이프스타일과 예산을 고려한 실용적인 인테리어/리모델링 조언을 제공합니다.

답변 원칙
정확성: 최신 정책과 규제를 정확히 반영합니다.
구체성: 추상적 조언보다는 구체적인 수치, 계산, 실행 방법을 제시합니다.
실용성: 사용자가 당장 실행할 수 있는 단계별 계획을 제공합니다.
이해도: 전문 용어는 쉬운 설명과 함께 사용합니다.

상황별 답변 예시
대출 문의: "월소득 500만원 기준으로 최대 3억원까지 대출 가능합니다. 디딤돌대출 1억원, 주택담보대출 2억원 조합이 적합합니다."
부동산 문의: "강남구 아파트 10억원 기준으로 매수 시 3억원, 매도 시 2억원 정도의 자금이 필요합니다."
인테리어 문의: "20평 기준 리모델링 비용은 3000만원 정도입니다. 우선순위는 주방과 화장실 개선입니다."

출력 형식
첫 줄: [제목] 형태로 답변 주제를 명시합니다.
본문: 자연스러운 문장으로 구성하며, 마크다운 기호나 목록을 사용하지 않습니다.
구조: 상황 분석 → 구체적 방안 → 실행 단계 순으로 정리합니다.`;

  function toPlainParagraphs(text?: string): string {
    if (!text) return "";
    // 제거: 코드펜스/인라인 백틱
    let t = text.replace(/```[\s\S]*?```/g, " ").replace(/`([^`]+)`/g, "$1");
    const lines = t.split(/\r?\n/);
    const out: string[] = [];
    let titled = false;
    for (let raw of lines) {
      let line = raw.trim();
      if (!line) { out.push(""); continue; }
      const m = line.match(/^(#{1,6})\s*(.+)$/); // markdown heading -> [제목]
      if (m) {
        const heading = m[2].trim();
        if (!titled) {
          out.push(`[${heading}]`);
          titled = true;
          continue;
        }
        line = heading;
      }
      // 불릿 제거
      line = line.replace(/^[-*+]\s+/, "");
      // 남은 강조기호 제거
      line = line.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");
      out.push(line);
    }
    // 공백라인 정리 및 문단 구분
    const compact: string[] = [];
    for (const l of out) {
      if (l === "") {
        if (compact.length === 0 || compact[compact.length - 1] === "") continue;
        compact.push("");
      } else {
        compact.push(l);
      }
    }
    // 문단 내부도 문장 단위로 줄바꿈(한국어 어미 중심 단순 규칙)
    const sentenceSplit = (p: string) =>
      p
        .replace(/\s+/g, " ")
        .replace(/(다\.|요\.|니다\.|임\.|음\.|!|\?)\s*/g, "$1\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const formatted: string[] = [];
    compact.forEach((p, idx) => {
      if (idx === 0 && /^\[.+\]$/.test(p)) {
        formatted.push(p);
      } else if (p === "") {
        formatted.push("");
      } else {
        formatted.push(sentenceSplit(p));
      }
    });

    return formatted.join("\n\n").trim();
  }
  // MOCK 모드: 키가 없거나 MOCK_AI=1이면 간단한 규칙 기반 답변을 반환해 개발/데모 가능
  const mockMode = !process.env.OPENAI_API_KEY || process.env.MOCK_AI === "1";
  if (mockMode) {
    const lastUser = message.trim();
    if (lastUser.length === 0) {
      return `[모의 답변]\n\n질문을 입력해 주세요. 무료 5회 질문 후 카카오페이 결제로 계속 이용할 수 있어요.`;
    }
    const mock = `# 모의 답변\n\n질문 요약: ${lastUser}\n\n권장 다음 단계\n- 현재 상황을 한 줄로 정리\n- 당장 할 일 1~2가지 제안\n- 필요 서류/링크 안내\n\n참고: 결제를 완료하면 전문 상담을 제한 없이 이어갈 수 있어요.`;
    return toPlainParagraphs(mock);
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      temperature: 0.6,
    });

    const textRaw = completion.choices?.[0]?.message?.content?.trim();
    const text = toPlainParagraphs(textRaw);
    if (text && text.length > 0) {
      return text;
    }
    console.warn("[openai] empty completion", completion);
    return "현재 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.";
  } catch (error) {
    console.error("[openai] completion error", error);
    return "현재 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
}


