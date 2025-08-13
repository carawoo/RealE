import { NextResponse } from "next/server";

// 아주 간단한 데모 로직: 사용자가 숫자(억/만원 포함)를 보내면 정규화해서 합계를 알려주는 흉내
const normalize = (s: string) => {
  const t = s.replace(/\s/g, "");
  if (t.endsWith("억")) return parseFloat(t) * 100000000;
  if (t.includes("억")) {
    const [e, m] = t.split("억");
    const man = (m || "0").replace("만원", "").replace("만", "");
    return (parseFloat(e || "0") * 100000000) + (parseFloat(man || "0") * 10000);
  }
  if (t.endsWith("만원")) return parseFloat(t) * 10000;
  if (t.endsWith("원")) return parseFloat(t);
  const n = parseFloat(t.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};

export async function POST(req: Request) {
  const body = await req.text();
  const { message } = JSON.parse(body || "{}");

  const won = normalize(String(message || ""));
  const reply =
    won > 0
      ? `입력 금액(추정): ${won.toLocaleString()}원. 데모: 지금은 더미 계산만 합니다.`
      : `메시지 받음: "${message}". 데모 답변입니다.`;

  return NextResponse.json({ ok: true, reply });
}
