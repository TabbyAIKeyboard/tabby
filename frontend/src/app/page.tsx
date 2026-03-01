"use client";

import { useEffect, useState } from "react";
import { ActionMenu } from "@/components/action-menu";
import { useTranscribeRecorder } from "@/hooks/useTranscribeRecorder";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  
  // Initialize transcribe recorder (listens for IPC events for audio recording)
  useTranscribeRecorder();

  useEffect(() => {
    if (typeof window !== "undefined" && window.electron) {
      const storedTextOutputMode = localStorage.getItem("ai-keyboard-text-output-mode") as "paste" | "typewriter" | "typewriter-leetcode" | null;
      const storedSuggestionMode = localStorage.getItem("ai-keyboard-suggestion-mode") as "hotkey" | "auto" | null;

      if (storedTextOutputMode) {
        window.electron.setTextOutputMode?.(storedTextOutputMode);
      }
      if (storedSuggestionMode) {
        window.electron.setSuggestionMode?.(storedSuggestionMode);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electron) {
      window.electron.onShowMenu((text) => {
        setSelectedText(text);
        setIsOpen(true);
      });
    }
  }, []);

  useEffect(() => {
    const MOVE_STEP = 50;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !window.electron?.moveWindow) return;

      const directions: Record<string, { x: number; y: number }> = {
        ArrowUp: { x: 0, y: -MOVE_STEP },
        ArrowDown: { x: 0, y: MOVE_STEP },
        ArrowLeft: { x: -MOVE_STEP, y: 0 },
        ArrowRight: { x: MOVE_STEP, y: 0 },
      };

      const delta = directions[e.key];
      if (delta) {
        e.preventDefault();
        window.electron.moveWindow(delta);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setSelectedText("");
    window.electron?.closeMenu();
  };

  const handleReplace = (text: string) => {
    window.electron?.replaceText(text);
    setIsOpen(false);
    setSelectedText("");
  };

  if (!isOpen) {
    return (
      <main className="flex flex-col h-screen rounded-2xl border border-white/20 dark:border-white/10 bg-background/80 backdrop-blur-2xl shadow-2xl">
        <div
          className="h-3 w-full cursor-move shrink-0 flex items-center justify-center"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Press <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">Ctrl+\</kbd></p>
            <p className="mt-2 text-xs">with text selected to activate</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-background/80 backdrop-blur-2xl shadow-2xl flex flex-col">
      <div
        className="h-3 w-full cursor-move shrink-0 flex items-center justify-center"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex-1 overflow-hidden">
        <ActionMenu
          selectedText={selectedText}
          onClose={handleClose}
          onReplace={handleReplace}
        />
      </div>
    </main>
  );
}
