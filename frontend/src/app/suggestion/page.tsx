"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Kbd } from "@/components/ui/kbd";
import { Sparkles, Loader2 } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { generateUUID } from "@/lib/utils/generate-uuid";
import { createAuthenticatedChatTransport } from "@/lib/api-url";

export default function SuggestionPage() {
  const lastContextRef = useRef<string>("");
  const isRequestingRef = useRef(false);

  const { messages, status, sendMessage, setMessages } = useChat({
    transport: createAuthenticatedChatTransport("/api/suggest"),
    generateId: () => generateUUID(),
    onError: (error) => {
      console.error("Suggestion error:", error);
      isRequestingRef.current = false;
    },
    onFinish: () => {
      isRequestingRef.current = false;
    },
  });

  useEffect(() => {
    console.log("[Suggestion] Setting up IPC listener");
    
    const handleShowSuggestion = (data: { context: string }) => {
      console.log("[Suggestion] Received context:", data.context?.slice(0, 50));
      
      if (data.context === lastContextRef.current) {
        console.log("[Suggestion] Skipping duplicate context");
        return;
      }
      
      lastContextRef.current = data.context;
      isRequestingRef.current = true;
      setMessages([]);
      
      console.log("[Suggestion] Calling sendMessage()");
      sendMessage(
        { 
          parts: [{ 
            type: "text", 
            text: `Complete this text naturally:\n\n${data.context}` 
          }] 
        },
        {
          body: { context: data.context },
        }
      );
    };

    const cleanup = window.electron?.onShowSuggestion?.(handleShowSuggestion);
    console.log("[Suggestion] Listener registered:", !!cleanup);
    
    return () => {
      console.log("[Suggestion] Cleaning up listener");
      cleanup?.();
    };
  }, [sendMessage, setMessages]);

  const lastAssistantMessage = messages
    .filter(m => m.role === "assistant")
    .pop();
  const completionText = lastAssistantMessage?.parts
    ?.filter(p => p.type === "text")
    .map(p => p.text)
    .join("") || "";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && completionText) {
        e.preventDefault();
        window.electron?.acceptSuggestion(completionText);
      } else if (e.key === "Escape") {
        e.preventDefault();
        window.electron?.dismissSuggestion();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [completionText]);

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="h-screen bg-transparent p-1.5 flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col rounded-lg border border-border/60 bg-background/95 backdrop-blur-md overflow-hidden">
        <div 
          className="shrink-0 h-5 bg-muted/40 cursor-move flex items-center justify-center border-b border-border/30"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 shrink-0">
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {messages.length === 0 && isLoading ? (
                <div className="space-y-2 pt-0.5">
                  <div className="animate-pulse h-3 bg-muted/60 rounded w-full" />
                  <div className="animate-pulse h-3 bg-muted/40 rounded w-3/4" />
                </div>
              ) : (
                <ChatMessages 
                  isLoading={isLoading} 
                  messages={messages.filter(m => m.role === "assistant")} 
                />
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-t border-border/40 bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>Tab</Kbd>
              <span>accept</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd>Esc</Kbd>
              <span>dismiss</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
