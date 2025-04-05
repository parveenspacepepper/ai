"use client";

import { Id, Doc } from "@/convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { ChatRequestBody, StreamMessageType } from "@/lib/types";
import { createSSEParser } from "@/lib/createSSEParser";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import MessageBubble from "./MessageBubble";

interface ChatInterfaceProps {
  chatId: Id<"chats">;
  initialMessages: Doc<"messages">[];
}

function ChatInterface({ chatId, initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Doc<"messages">[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponses, setStreamedResponse] = useState("");
  const [currentTool, setCurrentTool] = useState<{ name: string; input: unknown } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatToolOutput = (output: unknown): string => {
    if (typeof output === "string") return output;
    return JSON.stringify(output, null, 2);
  };

  const formatTerminalOutput = (tool: string, input: unknown, output: unknown) => {
    return `-START-\n<div class=\"bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal max-w-[600px]\">\n  <div class=\"flex items-center gap-1.5 border-b border-gray-700 pb-1\">\n    <span class=\"text-red-500\"></span>\n    <span class=\"text-yellow-500\"></span>\n    <span class=\"text-green-500\"></span>\n    <span class=\"text-gray-400 ml-1 text-sm\">~/${tool}</span>\n  </div>\n  <div class=\"text-gray-400 mt-1\">$ Input</div>\n  <pre class=\"text-yellow-400 mt-0.5 whitespace-pre-wrap overflow-x-auto\">${formatToolOutput(input)}</pre>\n  <div class=\"text-gray-400 mt-2\">$ Output</div>\n  <pre class=\"text-green-400 mt-0.5 whitespace-pre-wrap overflow-x-auto\">${formatToolOutput(output)}</pre>\n</div>\n--END--`;
  };

  const processStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string) => Promise<void>
  ) => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await onChunk(new TextDecoder().decode(value));
      }
    } finally {
      reader.releaseLock();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedResponses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setInput("");
    setStreamedResponse("");
    setCurrentTool(null);
    setIsLoading(true);

    const optimisticUserMessage: Doc<"messages"> = {
      _id: `temp_${Date.now()}`,
      chatId,
      content: trimmedInput,
      role: "user",
      createdAt: Date.now(),
    } as Doc<"messages">;

    setMessages((prev) => [...prev, optimisticUserMessage]);

    let fullResponse = "";

    try {
      const requestBody: ChatRequestBody = {
        messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
        newMessage: trimmedInput,
        chatId,
      };

    const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("No response body available");

      const parser = createSSEParser();
      const reader = response.body.getReader();

      await processStream(reader, async (chunk) => {
        const messages = parser.parse(chunk);

        for (const message of messages) {
          switch (message.type) {
            case StreamMessageType.Token:
              fullResponse += message.token;
              setStreamedResponse(fullResponse);
              break;

            case StreamMessageType.ToolStart:
              setCurrentTool({ name: message.tool, input: message.input });
              fullResponse += formatTerminalOutput(message.tool, message.input, "Processing...");
              setStreamedResponse(fullResponse);
              break;

            case StreamMessageType.ToolEnd:
              if (currentTool) {
                fullResponse = fullResponse.replace(
                  /<div class=\\"bg=\[#1e1e1e\][\s\S]*?--END--/, // replace last tool box
                  formatTerminalOutput(message.tool, currentTool.input, message.output)
                );
              }
              setStreamedResponse(fullResponse);
              setCurrentTool(null);
              break;

            case StreamMessageType.Error:
              throw new Error(message.error);

            case StreamMessageType.Done:
              const assistantMessage: Doc<"messages"> = {
                _id: `temp_assistant_${Date.now()}`,
                chatId,
                content: fullResponse,
                role: "assistant",
                createdAt: Date.now(),
              } as Doc<"messages">;

              const convex = getConvexClient();
              await convex.mutation(api.messages.store, {
                chatId,
                content: fullResponse,
                role: "assistant",
              });
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamedResponse("");
              return;
          }
        }
      });
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages((prev) => prev.filter((msg) => msg._id !== optimisticUserMessage._id));
      setStreamedResponse(
        formatTerminalOutput(
          "error",
          "Failed to process message",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-theme(spacing.14))]">
      <section className="flex-1 overflow-y-auto bg-gray-50 p-2 md:p-0">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {messages.map((message) => (
            <MessageBubble
              key={message._id}
              content={message.content}
              isUser={message.role === "user"}
            />
          ))}
          {streamedResponses && <MessageBubble content={streamedResponses} />}
          {isLoading && !streamedResponses && (
            <div className="flex justify-start animate-in fade-in-0">
              <div className="rounded-2xl px-4 py-3 bg-white text-gray-900 rounded-bl-none shadow-sm ring-1 ring-inset ring-gray-200">
                <div className="flex items-center gap-1.5">
                  {[0.3, 0.15, 0].map((delay, i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `-${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </section>

      <footer className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Agent..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${input.trim()
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                : "bg-gray-100 text-gray-400"
                }`}
            >
              <ArrowRight />
            </Button>
          </div>
        </form>
      </footer>
    </main>
  );
}

export default ChatInterface;