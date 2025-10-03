"use client";

import { useEffect, useState } from 'react';

export default function TestFortunePage() {
  const [result, setResult] = useState<string>('테스트 중...');

  useEffect(() => {
    const testApi = async () => {
      console.log('🧪 API 테스트 시작');
      try {
        const response = await fetch('/api/fortune/daily', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            type: 'daily',
            date: '2025-10-03',
            seed: 12345,
            slug: 'daily-2025-10-03-12345',
            timestamp: Date.now()
          })
        });
        const data = await response.json();
        if (response.ok) {
          setResult(JSON.stringify(data, null, 2));
        } else {
          setResult(`Error: ${data.error || '알 수 없는 오류'}\nDetails: ${data.details || '없음'}`);
        }
      } catch (err) {
        setResult(`Fetch Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    testApi();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 운세 API 테스트</h1>
      <h2>결과:</h2>
      <pre>{result}</pre>
    </div>
  );
}
