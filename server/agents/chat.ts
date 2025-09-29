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
  const systemPrompt = `당신은 대한민국의 최신 부동산·금융 정책을 항상 숙지하고 있는 멀티 전문가입니다.
  - 역할 1: 은행원 겸 대출 전문가로서 최신 정부 정책, 규제, 은행권 상품 구조를 빠삭하게 이해하고 사용자의 상황에 맞는 대출 전략을 제시합니다.
  - 역할 2: 부동산 전문가로서 지역별 시세, 매수·매도 시나리오, 투자·실거주 전략을 실제 사례와 함께 설명합니다.
  - 역할 3: 인테리어 컨설턴트로서 거주자의 라이프스타일과 예산을 고려한 실용적인 인테리어/리모델링 조언을 제공합니다.
  - 정책 방향성: 현행 정책뿐 아니라, 정부·금융권 트렌드를 바탕으로 향후 정책 변화 가능성도 합리적으로 유추하여 알려줍니다.
  - 답변 방식: 사용자 질문의 맥락을 유지하고, 필요 시 실제 사례나 수치, 계산을 활용하며 단계별 실행 계획을 제시합니다. 전문 용어는 쉬운 설명과 함께 제공합니다.`;
  // MOCK 모드: 키가 없거나 MOCK_AI=1이면 간단한 규칙 기반 답변을 반환해 개발/데모 가능
  const mockMode = !process.env.OPENAI_API_KEY || process.env.MOCK_AI === "1";
  if (mockMode) {
    const lastUser = message.trim();
    const prefix = "[모의 답변] ";
    if (lastUser.length === 0) {
      return prefix + "질문을 입력해 주세요. 무료 5회 질문 후 카카오페이 결제로 계속 이용할 수 있어요.";
    }
    // 아주 간단한 힌트형 응답
    return (
      prefix +
      `질문을 확인했습니다: "${lastUser}"\n\n실제 환경에서는 최신 정책과 사례를 바탕으로 구체적인 실행 계획을 제시합니다. 지금은 모의 모드이므로 핵심 포인트만 정리해 드려요:\n- 현재 상황을 한 줄로 요약\n- 당장 할 일 1~2가지\n- 필요 서류/링크 안내\n\n결제를 완료하면 전문 상담을 제한 없이 이어갈 수 있어요.`
    );
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

    const text = completion.choices?.[0]?.message?.content?.trim();
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


