"use client";

import { Shapes } from "lucide-react";
import { MessageResponse, Message, MessageContent } from "@/components/ai-elements/message";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";

interface PrepPatternTabProps {
  pattern?: string;
  difficulty?: string;
  complexity?: { time: string; space: string };
}

export function PrepPatternTab({ pattern, difficulty, complexity }: PrepPatternTabProps) {
  if (!pattern) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground p-6">
        <Shapes className="mb-4 h-10 w-10 opacity-40" />
        <p className="text-sm">No pattern identified yet.</p>
      </div>
    );
  }

  const content = `## 🎯 Pattern: ${pattern}

**Difficulty:** ${difficulty || "Unknown"}

### Complexity
| Metric | Value |
|--------|-------|
| Time | ${complexity?.time || "N/A"} |
| Space | ${complexity?.space || "N/A"} |
`;

  return (
    <Conversation>
      <ConversationContent>
        <Message from="assistant">
          <MessageContent>
            <MessageResponse>{content}</MessageResponse>
          </MessageContent>
        </Message>
      </ConversationContent>
    </Conversation>
  );
}
