"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useCallback, useEffect, useRef } from "react";
import { UIMessage } from "ai";
import { parsePartialJson } from "@ai-sdk/ui-utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ArrowLeft, X, Target, Camera, RefreshCw, Lightbulb, Code, FileText, FlaskConical, Brain, Plus, MessageSquare, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageResponse, Message, MessageContent } from "@/components/ai-elements/message";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { InterviewPromptInput } from "./interview-prompt-input";
import { InterviewHistory } from "./interview-history";
import { InterviewChatMessages } from "./interview-chat-messages";
import { generateUUID } from "@/lib/utils/generate-uuid";
import { InterviewAnalysis, Conversation as ConversationType } from "@/lib/ai/types";
import { createAuthenticatedChatTransport } from "@/lib/api-url";
import {
  getInterviewConversations,
  getConversationMessages,
  deleteConversation,
} from "@/lib/conversations-api";
import {
  AnalyzingLoading,
  IdeaLoading,
  CodeLoading,
  WalkthroughLoading,
  TestCasesLoading,
  MemoriesLoading,
  MistakesLoading,
} from "./loading-states";

interface InterviewCopilotPanelProps {
  onBack: () => void;
  onClose: () => void;
  onReplace?: (text: string) => void;
}

const TABS = [
  { id: "chat", label: "Chat", shortcut: "1", Icon: MessageSquare },
  { id: "idea", label: "Idea", shortcut: "2", Icon: Lightbulb },
  { id: "code", label: "Code", shortcut: "3", Icon: Code },
  { id: "walkthrough", label: "Walkthrough", shortcut: "4", Icon: FileText },
  { id: "testcases", label: "TC", shortcut: "5", Icon: FlaskConical },
  { id: "mistakes", label: "Mistakes", shortcut: "6", Icon: AlertTriangle },
  { id: "memories", label: "Memories", shortcut: "7", Icon: Brain },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function InterviewCopilotPanel({ onBack, onClose, onReplace }: InterviewCopilotPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => generateUUID());
  const [conversations, setConversations] = useState<ConversationType[]>([]);


  const { messages, status, sendMessage, setMessages } = useChat({
    transport: createAuthenticatedChatTransport("/api/interview-copilot"),
    generateId: () => generateUUID(),
    onError: (error) => {
      console.error("Interview Copilot error:", error);
    },
    onFinish: () => {
      loadConversations();
    },
  });

  const loadConversations = useCallback(async () => {
    try {
      const data = await getInterviewConversations();
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
    const body: Record<string, any> = {
      conversationId: activeConversationId,
    };

    if (screenshot) {
      body.screenshot = screenshot;
    }

    sendMessage(
      { parts: [{ type: "text", text }] },
      { body }
    );
  }, [sendMessage, activeConversationId]);

  const handleAnalyze = useCallback(async () => {
    setIsCapturing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const screenshot = await (window.electron as any)?.captureScreen?.();
      sendWithScreenshot("Analyze this coding problem. Provide Idea, Code, Walkthrough, and Test Cases.", screenshot);
    } catch (error) {
      console.error("Capture error:", error);
    }
    setIsCapturing(false);
  }, [sendWithScreenshot]);

  const handleUpdate = useCallback(async () => {
    setIsCapturing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const screenshot = await (window.electron as any)?.captureScreen?.();
      sendWithScreenshot("The interviewer added new constraints. Update the analysis for all sections.", screenshot);
    } catch (error) {
      console.error("Capture error:", error);
    }
    setIsCapturing(false);
  }, [sendWithScreenshot]);

  const handleCodeSuggestion = useCallback(async () => {
    setIsCapturing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const screenshot = await (window.electron as any)?.captureScreen?.();
      sendWithScreenshot("Suggest improvements to the current code approach. Focus on optimization and clean code.", screenshot);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        screenshot = await (window.electron as any)?.captureScreen?.();
      }
      
      sendWithScreenshot(prompt, screenshot);
    } catch (error) {
      console.error("Capture error:", error);
    } finally {
      setIsCapturing(false);
    }
  }, [sendWithScreenshot]);

  const isLoading = status === "streaming" || status === "submitted" || isCapturing;

  const getCurrentTabContent = useCallback((): string => {
    const analysis = getLatestAnalysis();
    if (!analysis) return "";
    
    switch (activeTab) {
      case "idea":
        return analysis.idea || "";
      case "code":
        return analysis.code || "";
      case "walkthrough":
        return analysis.walkthrough || "";
      case "testcases":
        if (analysis.testCases?.length) {
          const header = "| Input | Output | Reason |\n|---|---|---|\n";
          const rows = analysis.testCases.map(tc => `| \`${tc?.input}\` | \`${tc?.output}\` | ${tc?.reason} |`).join("\n");
          return header + rows;
        }
        return "";
      default:
        return "";
    }
  }, [activeTab, messages]);

  const handlePaste = useCallback(() => {
    const content = getCurrentTabContent();
    if (content && onReplace) {
      onReplace(content);
    }
  }, [getCurrentTabContent, onReplace]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key >= "1" && e.key <= "7") {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        setActiveTab(TABS[tabIndex].id);
        return;
      }

      if (e.altKey && e.key.toLowerCase() === "x" && !e.shiftKey) {
        e.preventDefault();
        handleAnalyze();
        return;
      }

      if (e.altKey && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        handleUpdate();
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

      // Handle Enter key to paste content on content tabs (not chat, mistakes, or memories)
      if (e.key === "Enter" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const contentTabs = ["idea", "code", "walkthrough", "testcases"];
        if (contentTabs.includes(activeTab)) {
          const content = getCurrentTabContent();
          if (content && !isLoading) {
            e.preventDefault();
            handlePaste();
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAnalyze, handleUpdate, handleCodeSuggestion, handleNewConversation, onBack, activeTab, getCurrentTabContent, isLoading, handlePaste]);


  const getAnalysisFromMessage = (msg: UIMessage): InterviewAnalysis | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = (msg as any).metadata;
    if (metadata?.analysis) {
      return metadata.analysis as InterviewAnalysis;
    }
    
    const textPart = msg.parts?.find((p) => p.type === "text");
    if (textPart && "text" in textPart) {
      const result = parsePartialJson(textPart.text);
      if (result.value && ["repaired-parse", "successful-parse"].includes(result.state)) {
        return result.value as InterviewAnalysis;
      }
    }
    return null;
  };

  const getLatestAnalysis = (): InterviewAnalysis | null => {
    const assistantMessages = messages.filter(m => m.role === "assistant");
    if (assistantMessages.length === 0) return null;
    return getAnalysisFromMessage(assistantMessages[assistantMessages.length - 1]);
  };

  const renderContent = () => {
    const analysis = getLatestAnalysis();
    
    if (messages.length === 0 && !isLoading) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
          <Target className="mb-4 h-12 w-12 opacity-50" />
          <h3 className="font-medium">Ready to Analyze</h3>
          <p className="mt-1 text-sm">
            Press <Kbd>Alt+X</Kbd> to analyze a coding problem
          </p>
        </div>
      );
    }

    if (activeTab === "chat") {
      return (
        <Conversation>
          <ConversationContent>
            <InterviewChatMessages 
              messages={messages} 
              isLoading={isLoading} 
              isCapturing={isCapturing}
            />
          </ConversationContent>
        </Conversation>
      );
    }

    if (activeTab === "mistakes") {
      const allMistakes = messages
        .filter(m => m.role === "assistant")
        .flatMap(m => getAnalysisFromMessage(m)?.mistakes || [])
        .filter(Boolean);
      
      if (allMistakes.length === 0) {
        if (status === "streaming" || status === "submitted") {
          return (
            <div className="flex flex-1 items-center justify-center">
              <MistakesLoading />
            </div>
          );
        }

        return (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground p-6">
            <AlertTriangle className="mb-4 h-10 w-10 opacity-40" />
            <p className="text-sm">No past mistakes found for this pattern.</p>
            <p className="mt-1 text-xs">Great job, or this is your first attempt!</p>
          </div>
        );
      }
      
      return (
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {allMistakes.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/50 bg-card/50 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-destructive">Mistake</p>
                      <p className="text-sm text-foreground">{item?.mistake}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Correction</p>
                      <p className="text-sm text-foreground">{item?.correction}</p>
                    </div>
                    <div className="pt-1">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {item?.pattern}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === "memories") {
      const allMemories = messages
        .filter(m => m.role === "assistant")
        .flatMap(m => getAnalysisFromMessage(m)?.memories || [])
        .filter(Boolean);
      
      if (allMemories.length === 0) {
        if (status === "streaming" || status === "submitted") {
          return (
            <div className="flex flex-1 items-center justify-center">
              <MemoriesLoading />
            </div>
          );
        }

        return (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
            <Target className="mb-4 h-10 w-10 opacity-40" />
            <p className="text-sm">No memories found.</p>
          </div>
        );
      }
      
      return (
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {allMemories.map((mem, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/50 bg-card/50 p-3 backdrop-blur-sm"
              >
                <p className="text-sm text-foreground">{mem?.memory}</p>
                {mem?.createdAt && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {new Date(mem.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    const content = (() => {
      if (!analysis) return "";
      
      switch (activeTab) {
        case "idea":
          return analysis.idea || "";
        case "code":
          return analysis.code || "";
        case "walkthrough":
          return analysis.walkthrough || "";
        case "testcases":
          if (analysis.testCases?.length) {
            const header = "| Input | Output | Reason |\n|---|---|---|\n";
            const rows = analysis.testCases.map(tc => `| \`${tc?.input}\` | \`${tc?.output}\` | ${tc?.reason} |`).join("\n");
            return header + rows;
          }
          return "";
        default:
          return "";
      }
    })();

    if (!content) {
      if (status === "submitted") {
        return (
          <div className="flex flex-1 items-center justify-center">
             <AnalyzingLoading isCapturing={false} />
          </div>
        );
      }

      if (status === "streaming") {
        const renderLoadingState = () => {
          switch (activeTab) {
            case "idea":
              return <IdeaLoading />;
            case "code":
              return <CodeLoading />;
            case "walkthrough":
              return <WalkthroughLoading />;
            case "testcases":
              return <TestCasesLoading />;
            default:
              return <AnalyzingLoading isCapturing={false} />;
          }
        };
        return (
          <div className="flex flex-1 items-center justify-center">
            {renderLoadingState()}
          </div>
        );
      }
    }

    if (!content) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
          <Target className="mb-4 h-10 w-10 opacity-40" />
          <p className="text-sm">No content for this tab yet.</p>
        </div>
      );
    }

    return (
      <Conversation>
        <ConversationContent>
          <Message from="assistant">
            <MessageContent>
              <MessageResponse>{content}</MessageResponse>
            </MessageContent>
          </Message>
        </ConversationContent>
      </Conversation>
    );
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Interview Copilot</span>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCodeSuggestion}
            disabled={isLoading}
            className="h-7 gap-1.5 text-xs"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Suggest
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
          placeholder="Type a custom prompt..."
        />
      </div>

      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Kbd>Alt+X</Kbd>
            <span>analyze</span>
          </div>
          <div className="flex items-center gap-1">
            <Kbd>Alt+Shift+X</Kbd>
            <span>update</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Kbd>Ctrl+1-7</Kbd>
            <span>tabs</span>
          </div>
          <div className="flex items-center gap-2">
            <Kbd>↵</Kbd>
            <span>paste</span>
          </div>
        </div>
      </div>
    </div>
  );
}
