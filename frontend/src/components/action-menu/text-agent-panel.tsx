"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useChat } from "@ai-sdk/react";
import { Action, ActionType } from "@/lib/ai/types";
import { loadActions, getActionPrompt } from "@/lib/ai/actions-store";
import { createAuthenticatedChatTransport } from "@/lib/api-url";
import { ResultPanel } from "./result-panel";
import { Kbd } from "@/components/ui/kbd";
import { ArrowLeft, X } from "lucide-react";
import { generateUUID } from "@/lib/utils/generate-uuid";
import { cn } from "@/lib/utils";

interface TextAgentPanelProps {
    selectedText: string;
    onBack: () => void;
    onClose: () => void;
    onReplace: (text: string) => void;
}

// 3x3 grid of AI tools (actions from command palette)
const TEXT_TOOLS = [
    { id: "fix-grammar", label: "Fix Grammar", icon: "✍️" },
    { id: "shorten", label: "Shorten", icon: "✂️" },
    { id: "expand", label: "Expand", icon: "📝" },
    { id: "professional-tone", label: "Professional", icon: "💼" },
    { id: "casual-tone", label: "Casual", icon: "😊" },
    { id: "friendly-tone", label: "Friendly", icon: "🤝" },
    { id: "email-writer", label: "Write Email", icon: "📧" },
    { id: "custom", label: "Custom", icon: "⚡" },
] as const;

export function TextAgentPanel({
    selectedText,
    onBack,
    onClose,
    onReplace,
}: TextAgentPanelProps) {
    const [currentAction, setCurrentAction] = useState<Action | null>(null);
    const [customPrompt, setCustomPrompt] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [showNoTextWarning, setShowNoTextWarning] = useState(false);
    const [allActions, setAllActions] = useState<Action[]>([]);
    const { theme } = useTheme();

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
    }, []);

    const handleToolClick = useCallback(
        async (toolId: string) => {
            // Check if text is selected before proceeding
            if (!selectedText || selectedText.trim().length === 0) {
                setShowNoTextWarning(true);
                return;
            }

            if (toolId === "custom") {
                setShowCustomInput(true);
                return;
            }

            const action = allActions.find((a) => a.id === toolId);
            if (!action) return;

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
        [allActions, sendMessage, selectedText, setMessages]
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

    const handleBackFromResult = useCallback(() => {
        setCurrentAction(null);
        setMessages([]);
        setShowCustomInput(false);
        setShowNoTextWarning(false);
    }, [setMessages]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (currentAction || showCustomInput || showNoTextWarning) {
                    handleBackFromResult();
                } else {
                    onBack();
                }
                return;
            }

            if (showCustomInput && e.key === "Enter" && customPrompt.trim()) {
                handleCustomSubmit();
                return;
            }

            if (currentAction && e.key === "Enter") {
                handlePaste();
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentAction, showCustomInput, showNoTextWarning, customPrompt, handleBackFromResult, handleCustomSubmit, handlePaste, onBack]);

    if (currentAction) {
        return (
            <ResultPanel
                actionLabel={currentAction.label}
                messages={messages.filter(m => m.role === "assistant")}
                isLoading={isLoading}
                onBack={handleBackFromResult}
                onClose={onClose}
                onCopy={handleCopy}
                onPaste={handlePaste}
            />
        );
    }

    if (showCustomInput) {
        return (
            <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 px-4 py-3 border-b">
                    <button
                        onClick={() => setShowCustomInput(false)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="font-medium text-sm">Custom Prompt</span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-4">
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

    if (showNoTextWarning) {
        return (
            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowNoTextWarning(false)}
                            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors duration-150"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <span className="font-semibold text-sm tracking-tight">✏️ Text Agent</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors duration-150"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Warning Message */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                        <span className="text-3xl">📝</span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">No text selected</h3>
                    <p className="text-sm text-muted-foreground/70 max-w-[240px] leading-relaxed">
                        Please select some text first, then reopen Tabby to try this feature again.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Kbd>esc</Kbd>
                        <span className="text-muted-foreground/70">back</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors duration-150"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold text-sm tracking-tight">✏️ Text Agent</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors duration-150"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* 3x3 Grid of tools */}
            <div className="flex-1 p-4 overflow-auto">
                <div className="grid grid-cols-3 gap-3">
                    {TEXT_TOOLS.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => handleToolClick(tool.id)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl",
                                "bg-white/[0.03] dark:bg-white/[0.03]",
                                "border border-white/[0.06] dark:border-white/[0.06]",
                                "hover:bg-white/[0.06] dark:hover:bg-white/[0.06]",
                                "hover:border-white/[0.12] dark:hover:border-white/[0.12]",
                                "hover:shadow-lg hover:shadow-black/10",
                                "transition-all duration-150 ease-out",
                                "group cursor-pointer"
                            )}
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform duration-150 ease-out">
                                {tool.icon}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground/70 group-hover:text-foreground/90 transition-colors duration-150">
                                {tool.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Kbd>esc</Kbd>
                    <span className="text-muted-foreground/70">back</span>
                </div>
                <span className="text-[11px] text-muted-foreground/40 tracking-wide">Select a text tool</span>
            </div>
        </div>
    );
}
