import { Action } from "@/lib/ai/types";

const STORAGE_KEY = "ai-keyboard-actions";

export const DEFAULT_ACTIONS: Action[] = [
  {
    id: "chat",
    label: "Chat Mode",
    icon: "💬",
    shortcut: "H",
    isDefault: true,
    group: "agent"
  },
  {
    id: "interview-copilot",
    label: "Interview Copilot",
    icon: "🎯",
    shortcut: "I",
    isDefault: true,
    description: "AI-powered coding interview assistant",
    group: "agent"
  },
  {
    id: "text-agent",
    label: "Text Agent",
    icon: "✏️",
    shortcut: "T",
    isDefault: true,
    description: "Quick text transformations and AI tools",
    group: "agent"
  },
  {
    id: "voice-agent",
    label: "Voice Agent",
    icon: "🎙️",
    shortcut: "V",
    isDefault: true,
    description: "Real-time voice conversation with AI",
    group: "agent"
  },
  {
    id: "fix-grammar",
    label: "Fix Grammar",
    icon: "✍️",
    shortcut: "F",
    isDefault: true,
    prompt: "You are a grammar and spelling expert. Fix all grammar, spelling, and punctuation errors in the text. Maintain the original tone and style. Return ONLY the corrected text, no explanations.",
    group: "action"
  },
  {
    id: "shorten",
    label: "Shorten Text",
    icon: "✂️",
    shortcut: "S",
    isDefault: true,
    prompt: "You are a concise writing expert. Condense the text while preserving all key information. Remove redundancy and filler words. Return ONLY the shortened text, no explanations.",
    group: "action"
  },
  {
    id: "expand",
    label: "Make Longer",
    icon: "📝",
    shortcut: "E",
    isDefault: true,
    prompt: "You are a content writer. Expand the text with relevant details, examples, and context. Maintain the original tone and message. Return ONLY the expanded text, no explanations.",
    group: "action"
  },
  {
    id: "professional-tone",
    label: "Professional Tone",
    icon: "💼",
    shortcut: "P",
    isDefault: true,
    prompt: "You are a business writing expert. Rewrite the text in a formal, professional tone. Suitable for business emails and documents. Return ONLY the rewritten text, no explanations.",
    group: "action"
  },
  {
    id: "casual-tone",
    label: "Casual Tone",
    icon: "😊",
    shortcut: "C",
    isDefault: true,
    prompt: "You are a casual writing expert. Rewrite the text in a relaxed, informal tone. Keep it friendly and conversational. Return ONLY the rewritten text, no explanations.",
    group: "action"
  },
  {
    id: "friendly-tone",
    label: "Friendly Tone",
    icon: "🤝",
    shortcut: "Y",
    isDefault: true,
    prompt: "You are a warm communication expert. Rewrite the text in a friendly, approachable tone. Add warmth while keeping the message clear. Return ONLY the rewritten text, no explanations.",
    group: "action"
  },
  {
    id: "email-writer",
    label: "Write Email",
    icon: "📧",
    shortcut: "M",
    isDefault: true,
    prompt: "You are an email writing expert. Transform the text into a well-structured email. Add appropriate greeting and sign-off. Format professionally. Return ONLY the email text, no explanations.",
    group: "action"
  },
  {
    id: "custom",
    label: "Custom Prompt",
    icon: "⚡",
    shortcut: "K",
    isDefault: true,
    group: "action"
  },
];

export function getDefaultActions(): Action[] {
  return DEFAULT_ACTIONS.map(action => ({ ...action }));
}

export function loadActions(): Action[] {
  if (typeof window === "undefined") return getDefaultActions();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed: Action[] = JSON.parse(saved);
      // Filter out legacy prep-mode action (replaced by text-agent)
      const filteredParsed = parsed.filter(a => a.id !== "prep-mode");
      const defaultIds = DEFAULT_ACTIONS.map(a => a.id);
      const savedIds = filteredParsed.map(a => a.id);

      const missingDefaults = DEFAULT_ACTIONS.filter(
        d => !savedIds.includes(d.id)
      );

      return [...filteredParsed, ...missingDefaults];
    } catch {
      return getDefaultActions();
    }
  }

  const defaults = getDefaultActions();
  saveActions(defaults);
  return defaults;
}

export function saveActions(actions: Action[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}

export function resetToDefaults(): Action[] {
  const defaults = getDefaultActions();
  saveActions(defaults);
  return defaults;
}

export function getActionPrompt(action: Action, customPrompt?: string): string {
  if (action.id === "custom" && customPrompt) {
    return `You are a versatile writing assistant. Follow the user's custom instructions precisely. Return ONLY the transformed text, no explanations.\n\nUser's instruction: ${customPrompt}`;
  }
  return action.prompt || "";
}

export function getActionByShortcut(actions: Action[], key: string): Action | undefined {
  const upperKey = key.toUpperCase();
  return actions.find(a => a.shortcut?.toUpperCase() === upperKey);
}

export function isShortcutTaken(actions: Action[], shortcut: string, excludeId?: string): boolean {
  const upperKey = shortcut.toUpperCase();
  return actions.some(
    a => a.shortcut?.toUpperCase() === upperKey && a.id !== excludeId
  );
}
