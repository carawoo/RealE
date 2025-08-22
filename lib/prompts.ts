// lib/prompts.ts

export const INITIAL_ASSISTANT_MESSAGE = `안녕하세요! 부동산 대출 상담을 도와드려요 🏠\n\n💡 **대출 시나리오 분석**을 원하시면:\n"월소득 500만원, 5억원 집 구입, 자기자본 1억원"\n처럼 구체적으로 알려주세요.\n\n🏦 **전문 정책 상담**:\n"디딤돌 신혼부부 체증식 2.5억"\n"상환방식 비교해줘"\n\n📝 다른 상담: 전세↔월세 비교, LTV/DSR 계산, 정책자금 안내 등`;

export type PromptSection = {
  title: string;
  body: string;
};

export const DISCLAIMER_POLICY_DYNAMIC =
  "정책과 금리는 수시로 변동될 수 있어요. 최신 공고/은행 안내를 함께 확인해 주세요.";

export const CTA_EXAMPLES = [
  '"월소득 450, 5억 매매, 자본금 1억으로 분석해줘"',
  '"전세 2억5천 vs 보증금 3억·월세 90만 비교"',
  '"보금자리론 생애최초 LTV 한도"',
  '"디딤돌 대출 자격 조건"'
];




