"use client";

import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageResponse, Message, MessageContent } from "@/components/ai-elements/message";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";

interface PrepHintsTabProps {
  hints?: Array<{ level: number; content: string }>;
  maxVisibleLevel?: number;
}

const HINT_LABELS = [
  "Gentle Nudge",
  "Pattern Hint",
  "Approach Hint",
  "Algorithm Steps",
  "Near Solution",
];

export function PrepHintsTab({ hints, maxVisibleLevel = 1 }: PrepHintsTabProps) {
  const [visibleLevel, setVisibleLevel] = useState(maxVisibleLevel);
  const [expandedHints, setExpandedHints] = useState<Set<number>>(new Set([1]));

  if (!hints || hints.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground p-6">
        <Lightbulb className="mb-4 h-10 w-10 opacity-40" />
        <p className="text-sm">No hints available yet.</p>
      </div>
    );
  }

  const sortedHints = [...hints].sort((a, b) => a.level - b.level);

  const toggleHint = (level: number) => {
    const newExpanded = new Set(expandedHints);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedHints(newExpanded);
  };

  const revealNextHint = () => {
    if (visibleLevel < 5) {
      const nextLevel = visibleLevel + 1;
      setVisibleLevel(nextLevel);
      setExpandedHints(new Set([...expandedHints, nextLevel]));
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="space-y-2">
        {sortedHints.map((hint) => {
          const isVisible = hint.level <= visibleLevel;
          const isExpanded = expandedHints.has(hint.level);

          return (
            <div
              key={hint.level}
              className={cn(
                "rounded-lg border transition-all",
                isVisible
                  ? "border-border/50 bg-card/50"
                  : "border-dashed border-muted-foreground/30 bg-muted/20"
              )}
            >
              <button
                onClick={() => isVisible && toggleHint(hint.level)}
                disabled={!isVisible}
                className={cn(
                  "flex w-full items-center justify-between p-3 text-left",
                  !isVisible && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {hint.level}
                  </span>
                  <span className="text-sm font-medium">
                    {HINT_LABELS[hint.level - 1] || `Hint ${hint.level}`}
                  </span>
                </div>
                {isVisible ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {isVisible && isExpanded && (
                <div className="border-t border-border/30 p-3">
                  <Conversation>
                    <ConversationContent>
                      <Message from="assistant">
                        <MessageContent>
                          <MessageResponse>{hint.content}</MessageResponse>
                        </MessageContent>
                      </Message>
                    </ConversationContent>
                  </Conversation>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visibleLevel < 5 && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={revealNextHint} className="gap-2">
            <Eye className="h-4 w-4" />
            Reveal Hint {visibleLevel + 1}
          </Button>
        </div>
      )}
    </div>
  );
}
