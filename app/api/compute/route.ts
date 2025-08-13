import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: "API key missing" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 가볍고 빠른 모델 권장: gpt-4o-mini
    // (텍스트 대화 + 한글 잘됨)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "너는 부동산/대출 상담사다. 사용자의 상황을 안전하게 파악하고, 숫자는 근거와 함께 보수적으로 제시한다. 불확실하면 확인 질문부터 한다.",
        },
        { role: "user", content: String(message ?? "") },
      ],
      temperature: 0.3,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { reply: "서버 에러가 발생했습니다." },
      { status: 500 },
    );
  }
}
