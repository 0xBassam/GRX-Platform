import { ChatClient } from "@/components/ChatClient";

// On a static export the root page can't redirect server-side, so we
// just render the chat directly at "/" — same view as "/chat/".
export default function Home() {
  return <ChatClient />;
}
