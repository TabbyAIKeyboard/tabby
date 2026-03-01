"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useCallback, useEffect } from "react";
import { UIMessage } from "ai";
import { parsePartialJson } from "@ai-sdk/ui-utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ArrowLeft, X, BookOpen, Camera, RefreshCw, MessageSquare, Shapes, Lightbulb, GitBranch, AlertTriangle, Brain, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { InterviewPromptInput } from "./interview-prompt-input";
import { InterviewHistory } from "./interview-history";
import { PrepChatMessages } from "./prep-chat-messages";
import { generateUUID } from "@/lib/utils/generate-uuid";
import { PrepAnalysis, Conversation as ConversationType } from "@/lib/ai/types";
import { createAuthenticatedChatTransport } from "@/lib/api-url";
import {
  getPrepConversations,
  getConversationMessages,
  deleteConversation,
} from "@/lib/conversations-api";
import {
  PrepPatternTab,
  PrepHintsTab,
  PrepSimilarTab,
  PrepMistakesTab,
  PrepMemoriesTab,
} from "./prep-tabs";
import {
  AnalyzingPrepLoading,
  PatternLoading,
  HintsLoading,
  SimilarLoading,
  MistakesLoading,
  PrepMemoriesLoading,
} from "./loading-states/prep-loading-states";

interface PrepModePanelProps {
  onBack: () => void;
  onClose: () => void;
}

const TABS = [
  { id: "chat", label: "Chat", shortcut: "1", Icon: MessageSquare },
  { id: "pattern", label: "Pattern", shortcut: "2", Icon: Shapes },
  { id: "hints", label: "Hints", shortcut: "3", Icon: Lightbulb },
  { id: "similar", label: "Similar", shortcut: "4", Icon: GitBranch },
  { id: "mistakes", label: "Mistakes", shortcut: "5", Icon: AlertTriangle },
  { id: "memories", label: "Memories", shortcut: "6", Icon: Brain },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PrepModePanel({ onBack, onClose }: PrepModePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => generateUUID());
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [hintLevel, setHintLevel] = useState(1);

  const { messages, status, sendMessage, setMessages } = useChat({
    transport: createAuthenticatedChatTransport("/api/prep-mode"),
    generateId: () => generateUUID(),
    onError: (error) => {
      console.error("Prep Mode error:", error);
    },
    onFinish: () => {
      loadConversations();
    },
  });

  const loadConversations = useCallback(async () => {
    try {
      const data = await getPrepConversations();
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSwitchConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    try {
      const msgs = await getConversationMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, [setMessages]);

  const handleNewConversation = useCallback(() => {
    const newId = generateUUID();
    setActiveConversationId(newId);
    setMessages([]);
    setHintLevel(1);
  }, [setMessages]);

  const handleDeleteConversation = useCallback(async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        handleNewConversation();
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  }, [activeConversationId, handleNewConversation]);

  const sendWithScreenshot = useCallback((text: string, screenshot?: string) => {
    const body: Record<string, unknown> = {
      conversationId: activeConversationId,
      hintLevel,
    };

    if (screenshot) {
      body.screenshot = screenshot;
    }

    sendMessage(
      { parts: [{ type: "text", text }] },
      { body }
    );
  }, [sendMessage, activeConversationId, hintLevel]);

  const handleAnalyze = useCallback(async () => {
    setIsCapturing(true);
    try {
      const screenshot = await (window.electron as { captureScreen?: () => Promise<string> })?.captureScreen?.();
      sendWithScreenshot("Analyze this coding problem. Identify the pattern, provide progressive hints, find similar problems, and check for my past mistakes on this pattern.", screenshot);
    } catch (error) {
      console.error("Capture error:", error);
    }
    setIsCapturing(false);
  }, [sendWithScreenshot]);

  const handleUpdate = useCallback(async () => {
    setIsCapturing(true);
    try {
      const screenshot = await (window.electron as { captureScreen?: () => Promise<string> })?.captureScreen?.();
      sendWithScreenshot("Update the analysis with the current state. I may have made progress or gotten stuck.", screenshot);
    } catch (error) {
      console.error("Capture error:", error);
    }
    setIsCapturing(false);
  }, [sendWithScreenshot]);

  const handleCustomPrompt = useCallback(async (prompt: string, includeScreenshot: boolean) => {
    try {
      let screenshot: string | undefined;
      
      if (includeScreenshot) {
        setIsCapturing(true);
        screenshot = await (window.electron as { captureScreen?: () => Promise<string> })?.captureScreen?.();
      }
      
      sendWithScreenshot(prompt, screenshot);
    } catch (error) {
      console.error("Capture error:", error);
    } finally {
      setIsCapturing(false);
    }
  }, [sendWithScreenshot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        setActiveTab(TABS[tabIndex].id);
        return;
      }

      if (e.altKey && e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        handleAnalyze();
        return;
      }

      if (e.altKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleUpdate();
        return;
      }

      if (e.altKey && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        setHintLevel(parseInt(e.key));
        setActiveTab("hints");
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewConversation();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAnalyze, handleUpdate, handleNewConversation, onBack]);

  const isLoading = status === "streaming" || status === "submitted" || isCapturing;

  const getAnalysisFromMessage = (msg: UIMessage): PrepAnalysis | null => {
    const metadata = (msg as UIMessage & { metadata?: { analysis?: PrepAnalysis } }).metadata;
    if (metadata?.analysis) {
      return metadata.analysis as PrepAnalysis;
    }
    
    const textPart = msg.parts?.find((p) => p.type === "text");
    if (textPart && "text" in textPart) {
      const result = parsePartialJson(textPart.text);
      if (result.value && ["repaired-parse", "successful-parse"].includes(result.state)) {
        return result.value as PrepAnalysis;
      }
    }
    return null;
  };

  const getLatestAnalysis = (): PrepAnalysis | null => {
    const assistantMessages = messages.filter(m => m.role === "assistant");
    if (assistantMessages.length === 0) return null;
    return getAnalysisFromMessage(assistantMessages[assistantMessages.length - 1]);
  };

  const renderContent = () => {
    const analysis = getLatestAnalysis();
    
    if (messages.length === 0 && !isLoading) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
          <BookOpen className="mb-4 h-12 w-12 opacity-50" />
          <h3 className="font-medium">Ready to Practice</h3>
          <p className="mt-1 text-sm">
            Press <Kbd>Alt+P</Kbd> to analyze a LeetCode problem
          </p>
        </div>
      );
    }

    if (activeTab === "chat") {
      return (
        <Conversation>
          <ConversationContent>
            <PrepChatMessages 
              messages={messages} 
              isLoading={isLoading} 
              isCapturing={isCapturing}
            />
          </ConversationContent>
        </Conversation>
      );
    }

    if (activeTab === "memories") {
      const allMemories = messages
        .filter(m => m.role === "assistant")
        .flatMap(m => getAnalysisFromMessage(m)?.memories || [])
        .filter(Boolean);
      
      if (allMemories.length === 0 && (status === "streaming" || status === "submitted")) {
        return (
          <div className="flex flex-1 items-center justify-center">
            <PrepMemoriesLoading />
          </div>
        );
      }

      return <PrepMemoriesTab memories={allMemories as Array<{ memory?: string; createdAt?: string }>} />;
    }

    if (!analysis && (status === "submitted" || status === "streaming")) {
      const renderLoadingState = () => {
        switch (activeTab) {
          case "pattern":
            return <PatternLoading />;
          case "hints":
            return <HintsLoading />;
          case "similar":
            return <SimilarLoading />;
          case "mistakes":
            return <MistakesLoading />;
          default:
            return <AnalyzingPrepLoading />;
        }
      };
      return (
        <div className="flex flex-1 items-center justify-center">
          {renderLoadingState()}
        </div>
      );
    }

    switch (activeTab) {
      case "pattern":
        return (
          <PrepPatternTab
            pattern={analysis?.pattern}
            difficulty={analysis?.difficulty}
            complexity={analysis?.complexity}
          />
        );
      case "hints":
        return (
          <PrepHintsTab
            hints={analysis?.hints}
            maxVisibleLevel={hintLevel}
          />
        );
      case "similar":
        return <PrepSimilarTab similar={analysis?.similar} />;
      case "mistakes":
        return <PrepMistakesTab mistakes={analysis?.mistakes} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Prep Mode</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAnalyze}
            disabled={isLoading}
            className="h-7 gap-1.5 text-xs"
          >
            <Camera className="h-3.5 w-3.5" />
            Analyze
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUpdate}
            disabled={isLoading || !getLatestAnalysis()}
            className="h-7 gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Update
          </Button>
          <InterviewHistory
            sessions={conversations}
            onSelect={handleSwitchConversation}
            onDelete={handleDeleteConversation}
            disabled={isLoading}
          />
          <Button variant="ghost" size="icon-sm" onClick={handleNewConversation} disabled={isLoading}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-sm font-medium transition-colors border-b-2",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            <Kbd className="ml-1 text-[10px]">{tab.shortcut}</Kbd>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-auto pb-10">
        {renderContent()}
      </div>

      <div className="absolute bottom-[3rem] left-4 right-4 z-20">
        <InterviewPromptInput
          onSubmit={handleCustomPrompt}
          disabled={isLoading}
          placeholder="Ask about the problem..."
        />
      </div>

      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Kbd>Alt+P</Kbd>
            <span>analyze</span>
          </div>
          <div className="flex items-center gap-1">
            <Kbd>Alt+1-5</Kbd>
            <span>hints</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Kbd>Ctrl+1-6</Kbd>
          <span>tabs</span>
        </div>
      </div>
    </div>
  );
}
