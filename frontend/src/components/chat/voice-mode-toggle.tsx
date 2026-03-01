"use client";

import { Mic, MessageSquare, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type VoiceMode = "input" | "conversational";

interface VoiceModeToggleProps {
  mode: VoiceMode;
  onModeChange: (mode: VoiceMode) => void;
  className?: string;
}

export function VoiceModeToggle({
  mode,
  onModeChange,
  className,
}: VoiceModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-1 rounded-lg bg-muted/50 p-0.5", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onModeChange("input")}
            className={cn(
              "h-6 gap-1 px-2 text-xs",
              mode === "input" && "bg-background shadow-sm"
            )}
          >
            <Mic className="h-3 w-3" />
            <span>Input</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Voice input only - AI responds with text</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onModeChange("conversational")}
            className={cn(
              "h-6 gap-1 px-2 text-xs",
              mode === "conversational" && "bg-background shadow-sm"
            )}
          >
            <Volume2 className="h-3 w-3" />
            <span>Talk</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Two-way voice - AI responds with speech</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
