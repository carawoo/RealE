const samples = [
  '오늘 보금자리론 대출신청 2억7천했는데 감정평가액 2억3000 나왔어요 ㅠㅠ 망했네요',
  '보금자리론이란?',
  '자본금 1억일때 전세, 월세중 뭘 추천해?',
];

async function run() {
  let ok = 0;
  for (const s of samples) {
    const res = await fetch('http://localhost:3000/api/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: s, conversationId: `no_tpl_${Date.now()}_${Math.random()}` })
    });
    const j = await res.json();
    const text = (j.content || '').toString();
    const hasTemplate = text.includes('상담원 조언') || text.includes('즉시 도움받기');
    console.log(`${hasTemplate ? '❌' : '✅'} ${s} -> ${text.slice(0, 50)}...`);
    if (!hasTemplate) ok++;
  }
  console.log(`\nNo-template check: ${ok}/${samples.length} pass`);
}

if (typeof window === 'undefined') run().catch(console.error);


