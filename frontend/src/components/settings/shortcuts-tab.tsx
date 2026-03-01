"use client";

import { Keyboard, Command, Zap, MessageSquare, Brain, Monitor } from "lucide-react";
import { SettingsPage } from "./settings-page";

interface Shortcut {
  keys: string;
  action: string;
}

interface ShortcutGroup {
  title: string;
  icon: React.ReactNode;
  description: string;
  shortcuts: Shortcut[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Global",
    icon: <Command className="w-4 h-4" />,
    description: "Available system-wide",
    shortcuts: [
      { keys: "Ctrl + \\", action: "Open/close action menu" },
      { keys: "Ctrl + Space", action: "Get AI suggestion" },
      { keys: "Ctrl + Shift + B", action: "Toggle brain panel" },
      { keys: "Ctrl + Shift + X", action: "Stop autotyping" },
      { keys: "Ctrl + Arrow", action: "Move floating window" },
      { keys: "Esc", action: "Back/close panel" },
    ],
  },
  {
    title: "Interview Copilot",
    icon: <Zap className="w-4 h-4" />,
    description: "Coding interview assistance",
    shortcuts: [
      { keys: "Alt + X", action: "Capture screen & analyze problem" },
      { keys: "Alt + Shift + X", action: "Update with new constraints" },
      { keys: "Alt + N", action: "Get code suggestions" },
      { keys: "Ctrl + 1", action: "Switch to Chat tab" },
      { keys: "Ctrl + 2", action: "Switch to Idea tab" },
      { keys: "Ctrl + 3", action: "Switch to Code tab" },
      { keys: "Ctrl + 4", action: "Switch to Walkthrough tab" },
      { keys: "Ctrl + 5", action: "Switch to Test Cases tab" },
      { keys: "Ctrl + 6", action: "Switch to Memories tab" },
      { keys: "Ctrl + N", action: "New conversation" },
    ],
  },
  {
    title: "Action Menu",
    icon: <MessageSquare className="w-4 h-4" />,
    description: "Quick AI actions",
    shortcuts: [
      { keys: "Tab", action: "Quick AI chat mode" },
      { keys: "Alt + [Key]", action: "Trigger specific action" },
      { keys: "Enter", action: "Accept & paste result" },
    ],
  },
  {
    title: "Voice & Transcription",
    icon: <Monitor className="w-4 h-4" />,
    description: "Voice input controls",
    shortcuts: [
      { keys: "Ctrl + Alt + T", action: "Toggle voice transcription" },
      { keys: "Ctrl + Shift + T", action: "Cycle transcribe modes" },
      { keys: "Ctrl + Alt + J", action: "Open voice agent" },
    ],
  },
  {
    title: "Advanced",
    icon: <Brain className="w-4 h-4" />,
    description: "Power user features",
    shortcuts: [
      { keys: "Ctrl + Alt + I", action: "Interview ghost text" },
    ],
  },
];

function KeyboardKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm text-foreground">
      {children}
    </kbd>
  );
}

function ShortcutKeys({ keys }: { keys: string }) {
  const parts = keys.split(" + ");
  return (
    <div className="flex items-center gap-1">
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-1">
          <KeyboardKey>{part}</KeyboardKey>
          {index < parts.length - 1 && (
            <span className="text-muted-foreground text-xs">+</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function ShortcutsTab() {
  return (
    <SettingsPage title="Keyboard Shortcuts" description="Master Tabby with these shortcuts">
      {/* Shortcut Groups */}
      <div className="space-y-6">
        {shortcutGroups.map((group) => (
          <div
            key={group.title}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden"
          >
            {/* Group Header */}
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-muted-foreground">
                  {group.icon}
                </div>
                <div>
                  <h2 className="font-medium text-foreground">{group.title}</h2>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
              </div>
            </div>

            {/* Shortcuts List */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {group.shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="px-5 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-sm text-foreground">{shortcut.action}</span>
                  <ShortcutKeys keys={shortcut.keys} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer tip */}
      <div className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-muted-foreground text-center">
          <span className="font-medium text-foreground">Tip:</span> Most shortcuts work globally, even when Tabby is in the background.
        </p>
      </div>
    </SettingsPage>
  );
}

