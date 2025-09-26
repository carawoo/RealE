import { test, expect } from "@playwright/test";

const CHAT_URL = "http://localhost:3000/chat";

async function sendMessage(page, text: string) {
  const textarea = page.locator("textarea");
  await textarea.fill(text);
  await textarea.press("Enter");
  await expect(page.locator(".chat-row.user").last()).toContainText(text);
}

test.describe("Chat new conversation reset", () => {
  test("clears history after new chat", async ({ page }) => {
    await page.goto(CHAT_URL);

    await page.waitForLoadState("networkidle");
    await expect(page.locator(".chat-row.assistant").first()).toContainText("RealE");

    await sendMessage(page, "테스트 메시지");
    await sendMessage(page, "두번째 메시지");

    await page.locator("button.nav-btn", { hasText: "새 상담 시작" }).click();
    await page.waitForURL(/\/chat$/);

    await expect(page.locator(".chat-row"), "history should reset").toHaveCount(1);
    await expect(page.locator(".chat-row.assistant").first()).toContainText("RealE(리얼이)");
  });
});
