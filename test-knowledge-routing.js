// 지식형 질문 라우팅 테스트
const cases = [
  { q: '보금자리론이란?', expect: '보금자리론' },
  { q: '개인 청약과 신혼부부 청약의 차이점', expect: '청약 차이' },
  { q: '전세사기 예방법', expect: '전세사기' },
  { q: '부동산대출을 어디서 받을수있지?', expect: '어디서' },
  { q: '자본금 1억일때 전세, 월세중 뭘 추천해?', expect: '전세 vs 월세' },
  { q: '한국에서 제일 매매가가 비싼 아파트 가격을 알려줘 15평으로', expect: '최고가' },
];

async function run() {
  let pass = 0;
  for (const c of cases) {
    const res = await fetch('http://localhost:3000/api/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: c.q, conversationId: `test_knowledge_${Date.now()}_${Math.random()}` })
    });
    const json = await res.json();
    const text = (json.content || '').toString();
    const isKnowledge = (
      text.includes('보금자리론은 무엇인가요') ||
      text.includes('개인(일반) 청약 vs 신혼부부 청약 차이') ||
      text.includes('전세사기 예방법') ||
      text.includes('부동산(주택) 대출은 어디서 받나요?') ||
      text.includes('자본금 기준 전세 vs 월세 추천') ||
      text.includes('한국 최고가 아파트(참고) — 15평 환산 방법')
    );
    const notCounselorTemplate = !text.startsWith('• **상담원 조언**');
    const ok = isKnowledge && notCounselorTemplate;
    console.log(`${ok ? '✅' : '❌'} ${c.q} -> ${(text.slice(0, 40))}...`);
    if (ok) pass++;
  }
  console.log(`\n결과: ${pass}/${cases.length} 통과`);
}

if (typeof window === 'undefined') run().catch(console.error);


