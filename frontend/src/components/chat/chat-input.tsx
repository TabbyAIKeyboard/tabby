"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUp, Loader2 } from "lucide-react";
import type { ChatStatus } from "ai";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  status: ChatStatus;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  status,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "streaming" || status === "submitted";

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    onSubmit(text);
    setInput("");
  }, [input, isStreaming, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex items-end gap-2 border-t bg-background p-3">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isStreaming}
        className={cn(
          "flex-1 resize-none rounded-lg border bg-muted/50 px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          "placeholder:text-muted-foreground",
          "min-h-[40px] max-h-[120px]",
          isStreaming && "opacity-50"
        )}
        rows={1}
      />
      <Button
        type="button"
        size="icon"
        onClick={handleSubmit}
        disabled={!input.trim() || isStreaming}
        className="h-10 w-10 shrink-0"
      >
        {isStreaming ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
