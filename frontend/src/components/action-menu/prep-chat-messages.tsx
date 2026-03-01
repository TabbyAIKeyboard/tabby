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
import { parsePartialJson } from "@ai-sdk/ui-utils";
import { PrepAnalysis } from "@/lib/ai/types";

interface PrepChatMessagesProps {
  isLoading: boolean;
  messages: UIMessage[];
  isCapturing?: boolean;
}

function ThinkingMessage() {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bot className="size-4" />
          <Shimmer duration={1.5}>Analyzing problem...</Shimmer>
        </div>
      </MessageContent>
    </Message>
  );
}

function PurePrepChatMessages({ isLoading, messages, isCapturing }: PrepChatMessagesProps) {
  const getAnalysisFromText = (text: string): PrepAnalysis | null => {
    const result = parsePartialJson(text);
    if (result.value && ["repaired-parse", "successful-parse"].includes(result.state)) {
      const val = result.value as Record<string, any>;
      if (val.pattern || val.hints || val.similar || val.mistakes || val.solution) {
        return val as PrepAnalysis;
      }
    }
    return null;
  };

  const formatAnalysisForChat = (analysis: PrepAnalysis): string => {
    const parts: string[] = [];

    if (analysis.pattern) {
      parts.push(`## 🎯 Pattern: ${analysis.pattern}`);
      if (analysis.difficulty) {
        parts.push(`**Difficulty:** ${analysis.difficulty}`);
      }
      parts.push("");
    }

    if (analysis.complexity) {
      parts.push(`### Complexity`);
      parts.push(`- **Time:** ${analysis.complexity.time}`);
      parts.push(`- **Space:** ${analysis.complexity.space}`);
      parts.push("");
    }

    if (analysis.hints && analysis.hints.length > 0) {
      parts.push(`### 💡 First Hint`);
      const firstHint = analysis.hints.find(h => h.level === 1) || analysis.hints[0];
      if (firstHint) {
        parts.push(firstHint.content);
      }
      parts.push("");
    }

    if (analysis.similar && analysis.similar.length > 0) {
      parts.push(`### 📚 Similar Problems`);
      analysis.similar.slice(0, 3).forEach(p => {
        parts.push(`- **${p.name}** - ${p.reason}`);
      });
      parts.push("");
    }

    return parts.join("\n") || "Analysis in progress...";
  };

  return (
    <>
      {messages.map((message, index) => {
        if (message.role === "user") {
          const textPart = message.parts?.find((p) => p.type === "text");
          const userText = textPart && "text" in textPart ? textPart.text : "";
          return (
            <Message key={message.id || index} from="user">
              <MessageContent>
                <p className="text-sm">{userText}</p>
              </MessageContent>
            </Message>
          );
        }

        return (
          <Message key={message.id || index} from="assistant">
            <MessageContent>
              {message.parts?.map((part, partIndex) => {
                if (part.type === "text") {
                  const analysis = getAnalysisFromText(part.text);
                  
                  if (analysis) {
                    const formattedContent = formatAnalysisForChat(analysis);
                    return (
                      <MessageResponse key={`part-${index}-${partIndex}`}>
                        {formattedContent}
                      </MessageResponse>
                    );
                  }

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
                
                if (part.type === "dynamic-tool") {
                  return <DynamicToolResult key={`dynamic-${partIndex}`} part={part as any} />;
                }
                
                return null;
              })}
            </MessageContent>
          </Message>
        );
      })}

      {isLoading && (isCapturing || messages[messages.length - 1]?.role === "user") && (
        <ThinkingMessage />
      )}
    </>
  );
}

export const PrepChatMessages = memo(PurePrepChatMessages);
