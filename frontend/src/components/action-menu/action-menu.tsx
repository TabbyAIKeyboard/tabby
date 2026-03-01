"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { useChat } from "@ai-sdk/react";
import { Action, ActionType } from "@/lib/ai/types";
import { loadActions, getActionPrompt, getActionByShortcut } from "@/lib/ai/actions-store";
import { createAuthenticatedChatTransport } from "@/lib/api-url";
import { ActionList } from "./action-list";
import { ResultPanel } from "./result-panel";
import { ChatPanel } from "./chat-panel";
import { InterviewCopilotPanel } from "./interview-copilot-panel";
import { TextAgentPanel } from "./text-agent-panel";
import { VoiceAgentPanel } from "./voice-agent-panel";
import { HomescreenLayout } from "./homescreen-layout";
import { Kbd } from "@/components/ui/kbd";
import { Search, Settings, Sun, Moon, LayoutGrid, List, Eye, EyeOff } from "lucide-react";
import { generateUUID } from "@/lib/utils/generate-uuid";

const LAYOUT_MODE_KEY = "ai-keyboard-layout-mode";

interface ActionMenuProps {
  selectedText: string;
  onClose: () => void;
  onReplace: (text: string) => void;
}

export function ActionMenu({
  selectedText,
  onClose,
  onReplace,
}: ActionMenuProps) {
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentAction, setCurrentAction] = useState<Action | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showChatMode, setShowChatMode] = useState(false);
  const [showCopilotMode, setShowCopilotMode] = useState(false);
  const [showTextAgentMode, setShowTextAgentMode] = useState(false);
  const [showVoiceAgentMode, setShowVoiceAgentMode] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"command-palette" | "homescreen">("command-palette");
  const [invisibilityEnabled, setInvisibilityEnabled] = useState(true);
  const [allActions, setAllActions] = useState<Action[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  const { messages, status, sendMessage, setMessages } = useChat({
    transport: createAuthenticatedChatTransport("/api/completion"),
    generateId: () => generateUUID(),
    onError: (error) => {
      console.error("Completion error:", error);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  const lastAssistantMessage = messages
    .filter(m => m.role === "assistant")
    .pop();
  const completion = lastAssistantMessage?.parts
    ?.filter(p => p.type === "text")
    .map(p => p.text)
    .join("") || "";

  useEffect(() => {
    setAllActions(loadActions());
    // Load layout mode from localStorage
    const storedLayoutMode = localStorage.getItem(LAYOUT_MODE_KEY) as "command-palette" | "homescreen" | null;
    if (storedLayoutMode) {
      setLayoutMode(storedLayoutMode);
    }
    // Load invisibility state from electron
    window.electron?.getContentProtectionEnabled?.().then((enabled: boolean) => {
      setInvisibilityEnabled(enabled);
    });
  }, []);

  const filteredActions = allActions
    .filter((action) => action.id !== "text-agent") // Text Agent only for grid view
    .filter((action) => action.label.toLowerCase().includes(filter.toLowerCase()));

  const handleActionSelect = useCallback(
    async (action: Action) => {
      if (action.id === "chat") {
        setShowChatMode(true);
        return;
      }

      if (action.id === "interview-copilot") {
        setShowCopilotMode(true);
        return;
      }

      if (action.id === "text-agent") {
        setShowTextAgentMode(true);
        return;
      }

      if (action.id === "voice-agent") {
        setShowVoiceAgentMode(true);
        return;
      }

      if (action.id === "custom") {
        setShowCustomInput(true);
        return;
      }

      setCurrentAction(action);
      setMessages([]);

      const prompt = getActionPrompt(action);
      sendMessage(
        {
          parts: [{
            type: "text",
            text: selectedText
          }]
        },
        {
          body: { action: action.id as ActionType, customPrompt: prompt },
        }
      );
    },
    [sendMessage, selectedText, setMessages]
  );

  const handleCustomSubmit = useCallback(async () => {
    const customAction = allActions.find((a) => a.id === "custom");
    if (!customAction) return;

    setCurrentAction(customAction);
    setShowCustomInput(false);
    setMessages([]);
    sendMessage(
      {
        parts: [{
          type: "text",
          text: selectedText
        }]
      },
      {
        body: { action: "custom" as ActionType, customPrompt },
      }
    );
  }, [allActions, sendMessage, customPrompt, selectedText, setMessages]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(completion);
  }, [completion]);

  const handlePaste = useCallback(() => {
    if (completion) {
      onReplace(completion);
    }
  }, [completion, onReplace]);

  const handleBack = useCallback(() => {
    setCurrentAction(null);
    setMessages([]);
    setShowCustomInput(false);
    setShowChatMode(false);
    setShowCopilotMode(false);
    setShowTextAgentMode(false);
    setShowVoiceAgentMode(false);
  }, [setMessages]);

  const handleAgentSelect = useCallback((agentId: string) => {
    const action = allActions.find(a => a.id === agentId);
    if (action) {
      handleActionSelect(action);
    }
  }, [allActions, handleActionSelect]);

  const toggleLayout = useCallback(() => {
    const newMode = layoutMode === "command-palette" ? "homescreen" : "command-palette";
    setLayoutMode(newMode);
    localStorage.setItem(LAYOUT_MODE_KEY, newMode);
  }, [layoutMode]);

  const toggleInvisibility = useCallback(() => {
    const newValue = !invisibilityEnabled;
    setInvisibilityEnabled(newValue);
    window.electron?.setContentProtectionEnabled?.(newValue);
  }, [invisibilityEnabled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showChatMode || showCopilotMode || showTextAgentMode || showVoiceAgentMode) return;

      if (e.key === "Escape") {
        if (currentAction || showCustomInput) {
          handleBack();
        } else {
          onClose();
        }
        return;
      }

      if (showCustomInput) {
        if (e.key === "Enter" && customPrompt.trim()) {
          handleCustomSubmit();
        }
        return;
      }

      if (currentAction) {
        if (e.key === "Enter") {
          handlePaste();
        }
        return;
      }

      if (e.altKey && e.key.length === 1) {
        const action = getActionByShortcut(allActions, e.key);
        if (action) {
          e.preventDefault();
          handleActionSelect(action);
          return;
        }
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const chatAction = allActions.find(a => a.id === "chat");
        if (chatAction) {
          handleActionSelect(chatAction);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredActions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredActions.length - 1
        );
      } else if (e.key === "Enter" && filteredActions[selectedIndex]) {
        handleActionSelect(filteredActions[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    allActions,
    currentAction,
    showCustomInput,
    showChatMode,
    customPrompt,
    filteredActions,
    selectedIndex,
    handleActionSelect,
    handleBack,
    handleCustomSubmit,
    handlePaste,
    onClose,
  ]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (showVoiceAgentMode) {
    return (
      <VoiceAgentPanel
        onBack={handleBack}
        onClose={onClose}
      />
    );
  }

  if (showTextAgentMode) {
    return (
      <TextAgentPanel
        selectedText={selectedText}
        onBack={handleBack}
        onClose={onClose}
        onReplace={onReplace}
      />
    );
  }

  if (showCopilotMode) {
    return (
      <InterviewCopilotPanel
        onBack={handleBack}
        onClose={onClose}
        onReplace={onReplace}
      />
    );
  }

  if (showChatMode) {
    return (
      <ChatPanel
        selectedText={selectedText}
        onBack={handleBack}
        onClose={onClose}
      />
    );
  }

  if (currentAction) {
    return (
      <ResultPanel
        actionLabel={currentAction.label}
        messages={messages.filter(m => m.role === "assistant")}
        isLoading={isLoading}
        onBack={handleBack}
        onClose={onClose}
        onCopy={handleCopy}
        onPaste={handlePaste}
      />
    );
  }

  if (showCustomInput) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <label className="text-sm font-medium">Enter your instruction:</label>
          <textarea
            autoFocus
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="flex-1 resize-none rounded-md border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Make this sound more confident..."
          />
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Kbd>esc</Kbd>
            <span>back</span>
          </div>
          <div className="flex items-center gap-2">
            <Kbd>↵</Kbd>
            <span>submit</span>
          </div>
        </div>
      </div>
    );
  }

  // Homescreen layout
  if (layoutMode === "homescreen") {
    return <HomescreenLayout onSelectAgent={handleAgentSelect} onToggleLayout={toggleLayout} />;
  }

  // Command palette layout (default)
  return (
    <div className="flex h-full flex-col">
      <div className="px-2.5 pt-2.5 pb-1.5">
        <div className="flex items-center gap-3 rounded-xl px-3.5 py-3 bg-white/[0.03] dark:bg-white/[0.03] border border-white/[0.06] dark:border-white/[0.06] transition-colors duration-150 focus-within:border-white/[0.12]">
          <Search className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <input
            ref={inputRef}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search for actions..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground/40 tracking-wide">Quick AI</span>
            <Kbd className="text-[10px] px-1.5 py-0.5 bg-white/[0.06] border-white/[0.08]">Tab</Kbd>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <ActionList
          actions={filteredActions}
          selectedIndex={selectedIndex}
          onSelect={handleActionSelect}
          filter={filter}
        />
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Kbd>esc</Kbd>
            <span className="text-muted-foreground/70">close</span>
          </div>
          <button
            onClick={() => window.electron.openSettings()}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors duration-150"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>settings</span>
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1 hover:text-foreground transition-colors duration-150"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={toggleLayout}
            className="flex items-center gap-1 hover:text-foreground transition-colors duration-150"
            title="Switch to grid layout"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleInvisibility}
            className="flex items-center gap-1 hover:text-foreground transition-colors duration-150"
            title={invisibilityEnabled ? "Hidden from screen recorders (click to show)" : "Visible to screen recorders (click to hide)"}
          >
            {invisibilityEnabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </div>
          <div className="flex items-center gap-2">
            <Kbd>↵</Kbd>
            <span className="text-muted-foreground/70">select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
