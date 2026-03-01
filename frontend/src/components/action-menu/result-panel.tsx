"use client";

import { UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Copy, X } from "lucide-react";

interface ResultPanelProps {
  actionLabel: string;
  messages: UIMessage[];
  isLoading: boolean;
  onBack: () => void;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
}

export function ResultPanel({
  actionLabel,
  messages,
  isLoading,
  onBack,
  onClose,
  onCopy,
  onPaste,
}: ResultPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={onBack} className="transition-colors duration-150">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary tracking-wide">
            {actionLabel}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} className="transition-colors duration-150">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 pt-3 h-[calc(100%-6rem)]">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <ChatMessages isLoading={isLoading} messages={messages} />
        )}
      </ScrollArea>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Kbd>esc</Kbd>
          <span className="text-muted-foreground/70">to close</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors duration-150"
          >
            <Copy className="h-3 w-3" />
            <span>copy</span>
          </button>
          <button
            onClick={onPaste}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors duration-150"
          >
            <Kbd>↵</Kbd>
            <span>to paste</span>
          </button>
        </div>
      </div>
    </div>
  );
}
