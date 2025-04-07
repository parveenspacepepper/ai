"use client";

import { useEffect, useState, use } from "react";
import ChatInterface from "@/components/ChatInterface";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { Doc } from "@/convex/_generated/dataModel";
interface ChatPageProps {
  params: Promise<{
    chatId: Id<"chats">;
  }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { chatId } = use(params); // ✅ unwrap promise with React.use()

  const [initialMessages, setInitialMessages] = useState<Doc<"messages">[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const convex = getConvexClient();
        const messages = await convex.query(api.messages.list, { chatId });
        setInitialMessages(messages);
      } catch (err) {
        console.error("Error Loading Chat:", err);
        setError(true);
      }
    };

    fetchMessages();
  }, [chatId]);

  if (error) return <div className="p-4 text-red-500">Failed to load chat.</div>;
  if (!initialMessages) return <div className="p-4">Loading...</div>;

  return (
    <div className="flex-1 overflow-hidden">
      <ChatInterface chatId={chatId} initialMessages={initialMessages} />
    </div>
  );
}
