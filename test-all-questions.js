const cases = [
  { name: '매매 고민 시나리오', q: '월급 340, 3억 매매고민중' },
  { name: '전세→월세 환산', q: '2억8천 전세보증금' },
  { name: '이전 답변 추궁', q: '뭐가 84만원이야?' },
  { name: '보금자리론 정의', q: '보금자리론이란?' },
  { name: '청약 차이', q: '개인 청약과 신혼부부 청약의 차이점' },
  { name: '전세사기 예방법', q: '전세사기 예방법' },
  { name: '대출 어디서', q: '부동산대출을 어디서 받을수있지?' },
  { name: '전세vs월세 자본금', q: '자본금 1억일때 전세, 월세중 뭘 추천해?' },
  { name: '최고가 15평', q: '한국에서 제일 매매가가 비싼 아파트 가격을 알려줘 15평으로' },
  { name: '감정평가 이슈', q: '오늘 보금자리론 대출신청 2억7천했는데 감정평가액 2억3000 나왔어요 ㅠㅠ 망했네요' },
  { name: '서울 아파트 구매', q: '월소득 300이지만 서울아파트를 사고싶어' },
  { name: '단순 정보 확인', q: '월소득 300만원이에요' },
  { name: '숫자만', q: '숫자만 콤마 포함해서 말해줘' },
  { name: '정책 LTV 질의', q: '보금자리론 LTV 한도 서울 아파트' },
];

function classify(content, cards) {
  const t = (content || '').toString();
  if (t.includes('보금자리론은 무엇인가요')) return '지식:보금자리론';
  if (t.includes('개인(일반) 청약 vs 신혼부부')) return '지식:청약 차이';
  if (t.includes('전세사기 예방법')) return '지식:전세사기';
  if (t.includes('부동산(주택) 대출은 어디서')) return '지식:어디서 대출';
  if (t.includes('자본금 기준 전세 vs 월세 추천')) return '지식:전세vs월세';
  if (t.includes('한국 최고가 아파트(참고)')) return '지식:최고가 15평';
  if (cards && cards[0] && cards[0].title && cards[0].title.includes('전세→월세 환산')) return '전세→월세 환산';
  if (t.includes('주택 구매 전략') || t.includes('서울 아파트 구매 전략')) return '구매 상담';
  if (t.includes('대출 시나리오') || (cards && cards[0] && cards[0].title && /시나리오|상환/.test(cards[0].title))) return '시나리오';
  if (t.includes('디딤돌') || t.includes('LTV')) return '정책/전문';
  if (t.includes('아, 정말 속상하시겠어요') || t.includes('감정평가')) return '상담(감정/감정가)';
  if (t.includes('확인된 정보')) return '정보 확인';
  if (t.trim().startsWith('0') || /^\d[\d,]*$/.test(t.trim())) return '숫자만';
  return '기타';
}

async function run() {
  const results = [];
  for (const c of cases) {
    const res = await fetch('http://localhost:3000/api/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: c.q, conversationId: `suite_${Date.now()}_${Math.random()}` })
    });
    let json;
    try { json = await res.json(); } catch (e) { json = { content: `ERROR: ${e.message}` }; }
    const kind = classify(json.content, json.cards);
    results.push({ name: c.name, kind, preview: (json.content || '').slice(0, 120), ok: res.ok });
  }
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} [${r.kind}] ${r.name} -> ${r.preview.replace(/\n/g,' ')}...`);
  }
}

if (typeof window === 'undefined') run().catch(console.error);


