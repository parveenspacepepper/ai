import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { submitQuestion } from "@/lib/langgraph";
import { ChatRequestBody, SSE_DATA_PREFIX, SSE_LINE_DELIMITER, StreamMessage, StreamMessageType } from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

function sendSSEMessage(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    data: StreamMessage
) {
    const encoder = new TextEncoder();
    return writer.write(
        encoder.encode(
            `${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`
        )
    );
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new Response("Unauthorized", { status: 401 });
        }
        const body = (await req.json()) as ChatRequestBody;
        const { messages, newMessage, chatId } = body;
        const convex = getConvexClient();
        // Create stream with larger queue strategy for better performance 
        const stream = new TransformStream({}, { highWaterMark: 1024 });
        const writer = stream.writable.getWriter();
        const response = new Response(stream.readable, {
            headers: {
                "Content-Type": "text/event-stream",
                // "Cache-Control": "no-cache, no-transform", 
                Connection: "keep-alive",
                "X-Accel-Buffering": "no", // Disable buffering for nginx which is required for SSE to work properly 
            },
        });
        const startStream = async () => {
            try {
                // Stream will be implemented here 
                // Send initial connection established message 
                await sendSSEMessage(writer, { type: StreamMessageType.Connected });
                // Send user message to Convex 
                await convex.mutation(api.messages.send, {
                    chatId,
                    content: newMessage,
                });

                // Convert messages to LangChain format 
                const langChainMessages = [
                    ...messages.map((msg) =>
                        msg.role === "user"
                            ? new HumanMessage(msg.content)
                            : new AIMessage(msg.content)
                    ),
                    new HumanMessage(newMessage),
                ];

                try {
                    // Create the event stream 
                    const eventStream = await submitQuestion(langChainMessages, chatId);
                    // Process the events 
                    for await (const event of eventStream) {
                        console.log("Streaming event received:", event);
                      
                        if (event.event === "on_chat_model_stream") {
                          const token = event.data.chunk?.content?.[0]?.text;
                          if (token) {
                            await sendSSEMessage(writer, {
                              type: StreamMessageType.Token,
                              token,
                            });
                          }
                        }
                      
                        if (event.event === "on_tool_start") {
                          await sendSSEMessage(writer, {
                            type: StreamMessageType.ToolStart,
                            tool: event.name || "unknown",
                            input: event.data.input,
                          });
                        }
                      
                        if (event.event === "on_tool_end") {
                          const toolMessage = new ToolMessage(event.data.output);
                          await sendSSEMessage(writer, {
                            type: StreamMessageType.ToolEnd,
                            tool: toolMessage.lc_kwargs.name || "unknown",
                            output: event.data.output,
                          });
                        }
                      
                        if (event.event === "on_chain_end" && event.name === "agent") {
                          const finalMessages = event.data.output?.messages;
                          if (finalMessages && finalMessages.length) {
                            const lastMsg = finalMessages[finalMessages.length - 1];
                            if (typeof lastMsg.content === "string") {
                              // Send full message as token chunk (or split if needed)
                              await sendSSEMessage(writer, {
                                type: StreamMessageType.Token,
                                token: lastMsg.content,
                              });
                            }
                          }
                        }
                      }
                      
                    // Send completion message without storing the response 
                    await sendSSEMessage(writer, { type: StreamMessageType.Done });
                } catch (streamError) {
                    console.error("Error in event stream:", streamError);
                    await sendSSEMessage(writer, {
                        type: StreamMessageType.Error,
                        error:
                            streamError instanceof Error
                                ? streamError.message
                                : "Stream processing failed",
                    });



                }
            }
            catch (error) {
                console.error("Error in stream:", error);
                await sendSSEMessage(writer, {
                    type: StreamMessageType.Error,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            } finally {
                try {
                    await writer.close();
                } catch (closeError) {
                    console.error("Error closing writer:", closeError);
                }
            }
        };
        startStream();;
        return response;

    } catch (error) {
        console.error("Error in chat API:", error);
        return NextResponse.json(
            { error: "Failed to process chat request" } as const,
            { status: 500 }
        );

    }
}

