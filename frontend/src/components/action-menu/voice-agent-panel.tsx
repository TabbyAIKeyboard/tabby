"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getToolName, isToolUIPart, TextPart, ToolUIPart } from "ai";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import { UIMessageWithCompleted, OPENAI_VOICE } from "@/lib/ai/voice";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  X,
  Mic,
  MicOff,
  Phone,
  Loader2,
  AlertTriangle,
  Wrench,
  Settings2,
  ChevronRight,
  MessageSquare,
  MessagesSquare,
} from "lucide-react";

interface VoiceAgentPanelProps {
  onBack: () => void;
  onClose: () => void;
}

export function VoiceAgentPanel({ onBack, onClose }: VoiceAgentPanelProps) {
  const [selectedVoice, setSelectedVoice] = useState<string>(OPENAI_VOICE.Ash);
  const [useCompactView, setUseCompactView] = useState(true);

  const {
    isListening,
    isAssistantSpeaking,
    isLoading,
    isActive,
    isUserSpeaking,
    messages,
    error,
    start,
    stop,
    startListening,
    stopListening,
  } = useVoiceChat({ voice: selectedVoice });

  const handleEndSession = useCallback(async () => {
    await stop();
  }, [stop]);

  const handleMicToggle = useCallback(async () => {
    if (!isActive) {
      await start();
    } else if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isActive, isListening, start, startListening, stopListening]);

  const statusMessage = useMemo(() => {
    if (isLoading) {
      return <span className="animate-pulse">Preparing...</span>;
    }
    if (!isActive) {
      return <span>Click the phone button to start</span>;
    }
    if (!isListening) {
      return <span>Your mic is off</span>;
    }
    if (!isAssistantSpeaking && messages.length === 0) {
      return <span>Ready when you are. Just start talking.</span>;
    }
    if (isUserSpeaking && useCompactView) {
      return <span className="animate-pulse">Listening...</span>;
    }
    if (!isAssistantSpeaking && !isUserSpeaking) {
      return <span>Ready when you are. Just start talking.</span>;
    }
    return null;
  }, [isAssistantSpeaking, isUserSpeaking, isActive, isLoading, isListening, messages.length, useCompactView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (isActive) {
          handleEndSession();
        } else {
          onBack();
        }
      }
      if (e.key === " " && !e.repeat) {
        e.preventDefault();
        handleMicToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack, isActive, handleEndSession, handleMicToggle]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Voice Agent</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUseCompactView(!useCompactView)}
            className="h-8 w-8"
          >
            {useCompactView ? (
              <MessageSquare className="h-4 w-4" />
            ) : (
              <MessagesSquare className="h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {Object.entries(OPENAI_VOICE).map(([key, value]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSelectedVoice(value)}
                  className="flex items-center justify-between"
                >
                  {key}
                  {value === selectedVoice && (
                    <span className="text-primary">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col relative">
        {error ? (
          <div className="p-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error.message}</p>
                <p className="text-sm mt-2 text-muted-foreground">
                  Please close and try again.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            {useCompactView ? (
              <CompactMessageView messages={messages} />
            ) : (
              <ConversationView messages={messages} />
            )}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2">
          <span className="text-sm text-muted-foreground">{statusMessage}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 py-4 border-t">
        <Button
          variant="secondary"
          size="icon"
          disabled={isLoading}
          onClick={handleMicToggle}
          className={cn(
            "rounded-full h-12 w-12 transition-all duration-300",
            isLoading
              ? "bg-muted/60 animate-pulse"
              : !isActive
                ? "bg-primary/15 text-primary hover:bg-primary/25 hover:scale-105"
                : !isListening
                  ? "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                  : isUserSpeaking
                    ? "bg-primary/25 text-primary ring-2 ring-primary/30"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : !isActive ? (
            <Phone className="h-5 w-5" />
          ) : isListening ? (
            <Mic className={cn("h-5 w-5", isUserSpeaking && "text-primary")} />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="secondary"
          size="icon"
          disabled={isLoading}
          onClick={isActive ? handleEndSession : onBack}
          className="rounded-full h-12 w-12"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Kbd>esc</Kbd>
            <span>{isActive ? "end" : "back"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Kbd>space</Kbd>
            <span>{!isActive ? "start" : isListening ? "mute" : "unmute"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationView({ messages }: { messages: UIMessageWithCompleted[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  return (
    <div className="w-full overflow-y-auto h-full px-4 py-4" ref={ref}>
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex px-3 py-2.5 rounded-xl",
              message.role === "user"
                ? "ml-auto max-w-[80%] bg-primary/8 border border-primary/10"
                : "mr-auto max-w-[80%] bg-muted/30"
            )}
          >
            {!message.completed ? (
              <span className="text-muted-foreground animate-pulse">...</span>
            ) : (
              message.parts.map((part, index) => {
                if (part.type === "text") {
                  return (
                    <p key={index} className="text-sm">
                      {(part as TextPart).text || "..."}
                    </p>
                  );
                } else if (isToolUIPart(part)) {
                  return (
                    <ToolBadge key={index} part={part as ToolUIPart} />
                  );
                }
                return null;
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactMessageView({ messages }: { messages: UIMessageWithCompleted[] }) {
  const { toolParts, textPart } = useMemo(() => {
    const toolParts = messages
      .filter((msg) => msg.parts.some(isToolUIPart))
      .map((msg) => msg.parts.find(isToolUIPart) as ToolUIPart | undefined)
      .filter(Boolean) as ToolUIPart[];

    const textPart = messages.findLast((msg) => msg.role === "assistant")
      ?.parts[0] as TextPart | undefined;
      
    return { toolParts, textPart };
  }, [messages]);

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center p-4">
      {toolParts.length > 0 && (
        <div className="absolute left-4 bottom-8 flex flex-col gap-2 max-h-[60%] overflow-y-auto">
          {toolParts.map((toolPart, index) => (
            <ToolBadge key={index} part={toolPart} compact />
          ))}
        </div>
      )}

      {textPart?.text && (
        <div className="max-w-[80%] text-center">
          <p className="text-lg font-medium leading-relaxed">
            {textPart.text.split(" ").map((word, i) => (
              <span key={i} className="animate-in fade-in duration-300">
                {word}{" "}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

function ToolBadge({ part, compact = false }: { part: ToolUIPart; compact?: boolean }) {
  const isExecuting = part.state.startsWith("input");
  const toolName = getToolName(part);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/40 text-xs",
        compact ? "max-w-[140px]" : ""
      )}
    >
      <Wrench className="h-3 w-3 shrink-0" />
      <span className="truncate font-medium">{toolName}</span>
      {isExecuting ? (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      ) : (
        <ChevronRight className="h-3 w-3 shrink-0" />
      )}
    </div>
  );
}
