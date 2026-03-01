"use client";

import { useState, useRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewPromptInputProps {
  onSubmit: (prompt: string, includeScreenshot: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const InterviewPromptInput = forwardRef<HTMLTextAreaElement, InterviewPromptInputProps>(
  ({ onSubmit, disabled, placeholder = "Type a custom prompt...", className }, ref) => {
    const [value, setValue] = useState("");
    const [includeScreenshot, setIncludeScreenshot] = useState(false);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const handleSubmit = () => {
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSubmit(trimmed, includeScreenshot);
      setValue("");
      setIncludeScreenshot(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    return (
      <div className={cn("relative flex items-end gap-2 bg-background/80 px-2 py-1.5 backdrop-blur-sm border rounded-full shadow-lg", className)}>
        <Button
          size="icon"
          variant={includeScreenshot ? "secondary" : "ghost"}
          onClick={() => setIncludeScreenshot(!includeScreenshot)}
          className={cn(
            "h-10 w-10 shrink-0 rounded-full transition-colors",
            includeScreenshot && "bg-primary text-primary-foreground hover:bg-primary/20",
            !includeScreenshot && "text-muted-foreground hover:bg-muted"
          )}
          title={includeScreenshot ? "Screenshot included" : "Include screenshot"}
        >
          <Camera className="h-6 w-6" />
        </Button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "max-h-32 min-h-[36px]"
          )}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className={cn(
            "h-10 w-10 shrink-0 rounded-full transition-all",
            value.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
          )}
        >
          <Send className="h-6 w-6" />
        </Button>
      </div>
    );
  }
);

InterviewPromptInput.displayName = "InterviewPromptInput";
