export const dynamic = "force-dynamic";
import ChatClient from "./ChatClient";
import "./chat.css";

export default function Chat() {
  return (
    <main className="chat-root">
      <ChatClient />
    </main>
  );
}