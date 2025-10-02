// server/mastra/agents/reale-agent.ts

import { getRealeAgent } from "../index";

export async function runRealeAgent(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: any
): Promise<string> {
  const systemPrompt = `당신은 한국의 부동산 대출/구매 상담 전문가입니다.\n- 한국어로 간결하고 친절하게 답하세요.\n- 사용자가 제공한 소득, 자기자본, 매수 가격 등의 수치를 활용하세요.\n- 모호한 부분은 명확히 묻고 다음 단계 행동지침을 제시하세요.`;

  let agent: any;
  try {
    agent = getRealeAgent();
  } catch (e: any) {
    console.error("[mastra] agent init failed", e);
    return "Mastra 에이전트를 초기화하는 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
  }

  try {
    const res = await agent?.respond?.({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
      context
    });

    const reply: any = res?.message ?? res?.content ?? res?.text ?? res?.choices?.[0]?.message?.content;
    const text = typeof reply === "string" ? reply.trim() : "";
    if (text.length > 0) {
      return text;
    }
  } catch (error) {
    console.error("[mastra] respond failed", error);
    return "현재 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }

  return "현재 답변을 생성하지 못했어요. 잠시 후 다시 시도해 주세요.";
}


