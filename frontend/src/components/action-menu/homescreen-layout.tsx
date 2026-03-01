"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Settings, Sun, Moon, List, Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";

interface HomescreenLayoutProps {
    onSelectAgent: (agentId: string) => void;
    onToggleLayout: () => void;
}

const AGENTS = [
    {
        id: "chat",
        label: "Chat Mode",
        image: "/images/tabby-chat.png",
        description: "AI-powered chat assistant",
        gradient: "from-blue-500/20 to-cyan-500/20",
        borderColor: "border-blue-500/30",
    },
    {
        id: "interview-copilot",
        label: "Interview Copilot",
        image: "/images/tabby-interview.png",
        description: "Coding interview assistant",
        gradient: "from-purple-500/20 to-pink-500/20",
        borderColor: "border-purple-500/30",
    },
    {
        id: "text-agent",
        label: "Text Agent",
        image: "/images/tabby-textagent.png",
        description: "Text transformations & tools",
        gradient: "from-orange-500/20 to-amber-500/20",
        borderColor: "border-orange-500/30",
    },
    {
        id: "voice-agent",
        label: "Voice Agent",
        image: "/images/tabby-voiceagent.png",
        description: "Real-time voice conversation",
        gradient: "from-green-500/20 to-emerald-500/20",
        borderColor: "border-green-500/30",
    },
] as const;

// ... (imports remain the same)

// ... (AGENTS array remains the same)

export function HomescreenLayout({ onSelectAgent, onToggleLayout }: HomescreenLayoutProps) {
    const { theme, setTheme } = useTheme();
    const [invisibilityEnabled, setInvisibilityEnabled] = useState(true);

    useEffect(() => {
        window.electron?.getContentProtectionEnabled?.().then((enabled: boolean) => {
            setInvisibilityEnabled(enabled);
        });
    }, []);

    const toggleInvisibility = () => {
        const newValue = !invisibilityEnabled;
        setInvisibilityEnabled(newValue);
        window.electron?.setContentProtectionEnabled?.(newValue);
    };

    return (
        <div className="flex h-full flex-col">
            {/* Agent Grid - 2x2 layout */}
            <div className="flex-1 p-4 overflow-auto">
                <div className="grid grid-cols-2 gap-4 h-full">
                    {AGENTS.map((agent) => (
                        <button
                            key={agent.id}
                            onClick={() => onSelectAgent(agent.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center p-6 rounded-3xl overflow-hidden",
                                "border",
                                agent.borderColor,
                                "hover:scale-[1.02] active:scale-[0.98]",
                                "hover:shadow-lg hover:shadow-black/20",
                                "transition-all duration-300 ease-out",
                                "group cursor-pointer"
                            )}
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0 z-0">
                                <img
                                    src={agent.image}
                                    alt={agent.label}
                                    className="w-full h-full object-cover opacity-90 transition-transform duration-500 ease-out group-hover:scale-105"
                                />
                                {/* Gradient Overlay */}
                                <div className={cn(
                                    "absolute inset-0 bg-gradient-to-br mix-blend-multiply opacity-80 backdrop-blur-[3px]",
                                    agent.gradient
                                )} />
                                {/* Darken overlay for text contrast */}
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center gap-2 text-white font-[family-name:var(--font-outfit)]">
                                {/* Layered Title Effect */}
                                <div className="relative">
                                    {/* Bottom Layer (Blur/Glow) */}
                                    <span className={cn(
                                        "absolute inset-0 text-lg font-bold tracking-tight text-black/50 blur-[2px] select-none",
                                        "translate-y-[1px]"
                                    )}>
                                        {agent.label}
                                    </span>
                                    {/* Top Layer (Crisp) */}
                                    <span className={cn(
                                        "relative text-lg font-bold tracking-tight drop-shadow-sm",
                                        "group-hover:translate-y-[-2px] transition-transform duration-300",
                                        "bg-gradient-to-b from-white to-white/90 bg-clip-text text-transparent"
                                    )}>
                                        {agent.label}
                                    </span>
                                </div>

                                <span className="text-xs font-medium text-white/90 text-center leading-relaxed max-w-[85%] drop-shadow-md shadow-black/20">
                                    {agent.description}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-white/[0.06] rounded border border-white/[0.08]">esc</kbd>
                        <span className="text-muted-foreground/70">close</span>
                    </div>
                    <button
                        onClick={() => window.electron?.openSettings()}
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
                        onClick={onToggleLayout}
                        className="flex items-center gap-1 hover:text-foreground transition-colors duration-150"
                        title="Switch to list layout"
                    >
                        <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={toggleInvisibility}
                        className="flex items-center gap-1 hover:text-foreground transition-colors duration-150"
                        title={invisibilityEnabled ? "Visible to screen recorders (click to hide)" : "Hidden from screen recorders (click to show)"}
                    >
                        {invisibilityEnabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                </div>
                <span className="text-[11px] text-muted-foreground/40 tracking-wide">Select an agent</span>
            </div>
        </div>
    );
}
