import { ChatClient } from "@/components/ChatClient";
import { isDemo } from "@/lib/env";

export default function ChatPage() {
  return <ChatClient demo={isDemo()} />;
}
