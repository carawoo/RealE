import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/agents/chat", () => ({
  runChatAgent: vi.fn(async (message: string) => `Mock reply for ${message}`),
}));

vi.mock("@/server/supabase", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({ insert: async () => ({}) }),
  }),
}));

import { POST } from "../app/api/copilot/route";

function createJsonRequest(body: any) {
  return new Request("http://localhost/api/copilot", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

async function readStreamText(stream: ReadableStream<Uint8Array> | null) {
  if (!stream) throw new Error("no stream");
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe("/api/copilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("streams assistant reply", async () => {
    const req = createJsonRequest({ message: "안녕", conversationId: "test" });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const payloads = await readStreamText(res.body);
    expect(payloads.length).toBeGreaterThan(0);
    const finalPayload = payloads[payloads.length - 1];
    expect(finalPayload.done).toBe(true);
    expect(finalPayload.content).toBe("Mock reply for 안녕");
  });
});


