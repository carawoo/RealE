// server/mastra/index.ts
import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { tools } from './tools';
import { workflows } from './workflows';
import { memory } from './memory';

let instance: any | undefined;
let realeAgentInstance: any | undefined;

function createMastra(): any {
  const systemPrompt = `당신은 한국의 부동산 대출/구매 상담 전문가입니다.\n- 한국어로 간결하고 친절하게 답하세요.\n- 사용자가 제공한 소득, 자기자본, 매수 가격 등의 수치를 활용하세요.\n- 모호한 부분은 명확히 묻고 다음 단계 행동지침을 제시하세요.`;

  const realeAgent = new Agent({
    name: 'RealE Agent',
    instructions: systemPrompt,
    tools,
    model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
  } as any);
  realeAgentInstance = realeAgent;

  const mastra = new Mastra({
    agents: {
      reale: realeAgent,
    },
    tools,
    workflows,
  } as any);

  return mastra;
}

export function getMastra(): any {
  if (!instance) instance = createMastra();
  return instance;
}

export function getRealeAgent(): any {
  if (!instance) instance = createMastra();
  return realeAgentInstance;
}


