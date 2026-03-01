"use client";

import { UIMessage, isStaticToolUIPart } from "ai";
import { memo } from "react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { DynamicToolResult } from "@/components/chat/tool-display/dynamic-tool-result";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Bot } from "lucide-react";

interface ChatMessagesProps {
  isLoading: boolean;
  messages: UIMessage[];
}

function ThinkingMessage() {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bot className="size-4" />
          <Shimmer duration={1.5}>Thinking...</Shimmer>
        </div>
      </MessageContent>
    </Message>
  );
}

function PureChatMessages({ isLoading, messages }: ChatMessagesProps) {
  return (
    <>
      {messages.map((message, index) => {
        return (
          <Message key={message.id || index} from={message.role === "user" ? "user" : "assistant"}>
            <MessageContent>
              {message.parts?.map((part, partIndex) => {
                if (part.type === "text") {
                  return (
                    <MessageResponse key={`part-${index}-${partIndex}`}>
                      {part.text}
                    </MessageResponse>
                  );
                }
                if (part.type === "reasoning") {
                  const isLastPart = partIndex === message.parts.length - 1;
                  const isLastMessage = message.id === messages.at(-1)?.id;
                  return (
                    <Reasoning
                      key={`reasoning-${index}-${partIndex}`}
                      className="w-full"
                      isStreaming={isLoading && isLastPart && isLastMessage}
                    >
                      <ReasoningTrigger />
                      <ReasoningContent>{part.text}</ReasoningContent>
                    </Reasoning>
                  );
                }
                if (isStaticToolUIPart(part)) {
                  return <DynamicToolResult key={part.toolCallId} part={part as any} />;
                }
                // Dynamic MCP tools
                if (part.type === "dynamic-tool") {
                  return <DynamicToolResult key={`dynamic-${partIndex}`} part={part as any} />;
                }
                return null;
              })}
            </MessageContent>
          </Message>
        );
      })}

      {isLoading && messages[messages.length - 1]?.role === "user" && <ThinkingMessage />}
    </>
  );
}

export const ChatMessages = memo(PureChatMessages);
