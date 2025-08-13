// app/api/compute/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: "API key missing" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "너는 부동산/대출 상담사다. 사용자의 조건을 안전하게 확인하고 모르면 질문부터 한다. 수치는 보수적으로 제시하고 근거를 짧게 덧붙인다.",
        },
        { role: "user", content: String(message ?? "") },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { reply: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
