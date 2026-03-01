"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, Clock, Keyboard, Sparkles, Type, Brain, Zap, Rocket } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { models, defaultModel as defaultModelId, defaultFastModel as defaultFastModelId } from "@/lib/ai/models";
import { SettingsPage, SettingsSection, SettingRow, StatusBadge, SettingsCard } from "./settings-page";

const STORAGE_KEYS = {
  SUGGESTION_MODE: "ai-keyboard-suggestion-mode",
  TEXT_OUTPUT_MODE: "ai-keyboard-text-output-mode",
  GHOST_TEXT_ENABLED: "ai-keyboard-ghost-text-enabled",
  GHOST_TEXT_AUTO_TRIGGER: "ai-keyboard-ghost-text-auto-trigger",
  GHOST_TEXT_AUTO_TRIGGER_DELAY: "ai-keyboard-ghost-text-auto-trigger-delay",
  DEFAULT_MODEL: "ai-keyboard-default-model",
  DEFAULT_FAST_MODEL: "ai-keyboard-default-fast-model",
};

// Keyboard shortcut display
function ShortcutDisplay({ keys }: { keys: string }) {
  const parts = keys.split("+");
  return (
    <div className="flex items-center gap-0.5">
      {parts.map((key, i) => (
        <span key={i} className="flex items-center">
          <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-300">
            {key.trim()}
          </kbd>
          {i < parts.length - 1 && <span className="text-zinc-400 mx-0.5 text-xs">+</span>}
        </span>
      ))}
    </div>
  );
}

export function GeneralTab() {
  const [suggestionMode, setSuggestionMode] = useState<"hotkey" | "auto">("hotkey");
  const [textOutputMode, setTextOutputMode] = useState<"paste" | "typewriter" | "typewriter-leetcode">("paste");
  const [ghostTextEnabled, setGhostTextEnabled] = useState(false);
  const [ghostTextAutoTrigger, setGhostTextAutoTrigger] = useState(false);
  const [ghostTextAutoTriggerDelay, setGhostTextAutoTriggerDelay] = useState(3);
  const [selectedDefaultModel, setSelectedDefaultModel] = useState(defaultModelId);
  const [selectedFastModel, setSelectedFastModel] = useState(defaultFastModelId);

  const groupedModels = useMemo(() => {
    return models.reduce((acc, model) => {
      const provider = model.provider || "Custom";
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, typeof models>);
  }, []);

  useEffect(() => {
    const storedSuggestionMode = localStorage.getItem(STORAGE_KEYS.SUGGESTION_MODE) as "hotkey" | "auto" | null;
    const storedTextOutputMode = localStorage.getItem(STORAGE_KEYS.TEXT_OUTPUT_MODE) as "paste" | "typewriter" | "typewriter-leetcode" | null;
    const storedGhostText = localStorage.getItem(STORAGE_KEYS.GHOST_TEXT_ENABLED);
    const storedDefaultModel = localStorage.getItem(STORAGE_KEYS.DEFAULT_MODEL);
    const storedFastModel = localStorage.getItem(STORAGE_KEYS.DEFAULT_FAST_MODEL);

    if (storedSuggestionMode) {
      setSuggestionMode(storedSuggestionMode);
      window.electron?.setSuggestionMode?.(storedSuggestionMode);
    }

    if (storedTextOutputMode) {
      setTextOutputMode(storedTextOutputMode);
      window.electron?.setTextOutputMode?.(storedTextOutputMode);
    }

    if (storedGhostText) {
      const enabled = storedGhostText === "true";
      setGhostTextEnabled(enabled);
      window.electron?.setGhostTextEnabled?.(enabled);
    }

    const storedAutoTrigger = localStorage.getItem(STORAGE_KEYS.GHOST_TEXT_AUTO_TRIGGER);
    const storedAutoTriggerDelay = localStorage.getItem(STORAGE_KEYS.GHOST_TEXT_AUTO_TRIGGER_DELAY);

    if (storedAutoTrigger) {
      const enabled = storedAutoTrigger === "true";
      setGhostTextAutoTrigger(enabled);
      window.electron?.setGhostTextAutoTrigger?.(enabled);
    }

    if (storedAutoTriggerDelay) {
      const delay = parseFloat(storedAutoTriggerDelay);
      setGhostTextAutoTriggerDelay(delay);
      window.electron?.setGhostTextAutoTriggerDelay?.(delay * 1000);
    }

    if (storedDefaultModel) {
      setSelectedDefaultModel(storedDefaultModel);
      window.electron?.setDefaultModel?.(storedDefaultModel);
    }

    if (storedFastModel) {
      setSelectedFastModel(storedFastModel);
      window.electron?.setDefaultFastModel?.(storedFastModel);
    }
  }, []);

  const handleModeChange = (mode: "hotkey" | "auto") => {
    setSuggestionMode(mode);
    localStorage.setItem(STORAGE_KEYS.SUGGESTION_MODE, mode);
    window.electron?.setSuggestionMode?.(mode);
  };

  const handleTextOutputModeChange = (mode: "paste" | "typewriter" | "typewriter-leetcode") => {
    setTextOutputMode(mode);
    localStorage.setItem(STORAGE_KEYS.TEXT_OUTPUT_MODE, mode);
    window.electron?.setTextOutputMode?.(mode);
  };

  const handleGhostTextChange = (enabled: boolean) => {
    setGhostTextEnabled(enabled);
    localStorage.setItem(STORAGE_KEYS.GHOST_TEXT_ENABLED, String(enabled));
    window.electron?.setGhostTextEnabled?.(enabled);
  };

  const handleAutoTriggerChange = (enabled: boolean) => {
    setGhostTextAutoTrigger(enabled);
    localStorage.setItem(STORAGE_KEYS.GHOST_TEXT_AUTO_TRIGGER, String(enabled));
    window.electron?.setGhostTextAutoTrigger?.(enabled);
  };

  const handleAutoTriggerDelayChange = (value: number[]) => {
    const delay = value[0];
    setGhostTextAutoTriggerDelay(delay);
    localStorage.setItem(STORAGE_KEYS.GHOST_TEXT_AUTO_TRIGGER_DELAY, String(delay));
    window.electron?.setGhostTextAutoTriggerDelay?.(delay * 1000);
  };

  const handleDefaultModelChange = (model: string) => {
    setSelectedDefaultModel(model);
    localStorage.setItem(STORAGE_KEYS.DEFAULT_MODEL, model);
    window.electron?.setDefaultModel?.(model);
  };

  const handleFastModelChange = (model: string) => {
    setSelectedFastModel(model);
    localStorage.setItem(STORAGE_KEYS.DEFAULT_FAST_MODEL, model);
    window.electron?.setDefaultFastModel?.(model);
  };

  return (
    <SettingsPage title="General" description="Configure app appearance and behavior">
      {/* Status Section */}
      <SettingsSection title="Status">
        <SettingsCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Accessibility Permissions</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tabby can access text in other applications
                </p>
              </div>
            </div>
            <StatusBadge status="success" label="Enabled" />
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Shortcuts Section */}
      <SettingsSection title="Shortcuts">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Keyboard className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-foreground">Open action menu</span>
            </div>
            <ShortcutDisplay keys="Ctrl + \\" />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-foreground">Trigger ghost text</span>
            </div>
            <ShortcutDisplay keys="Ctrl + Alt + G" />
          </div>
        </div>
      </SettingsSection>

      {/* AI Models Section */}
      <SettingsSection title="AI Models" description="Choose models for different tasks">
        <div className="space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <SettingRow
            icon={<Brain className="w-4 h-4" />}
            title="Default Model"
            description="Main model for code generation and suggestions"
          >
            <Select value={selectedDefaultModel} onValueChange={handleDefaultModelChange}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <SelectGroup key={provider}>
                    <SelectLabel>{provider}</SelectLabel>
                    {providerModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            icon={<Zap className="w-4 h-4" />}
            title="Fast Model"
            description="Faster model for quick completions"
          >
            <Select value={selectedFastModel} onValueChange={handleFastModelChange}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <SelectGroup key={provider}>
                    <SelectLabel>{provider}</SelectLabel>
                    {providerModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </SettingsSection>

      {/* Behavior Section */}
      <SettingsSection title="Behavior">
        <div className="space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <SettingRow
            icon={<Sparkles className="w-4 h-4" />}
            title="AI Suggestions"
            description={suggestionMode === "hotkey" 
              ? "Press Ctrl+Space to get suggestions" 
              : "Suggestions appear automatically on copy"
            }
          >
            <Select value={suggestionMode} onValueChange={(v) => handleModeChange(v as "hotkey" | "auto")}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hotkey">Hotkey only</SelectItem>
                <SelectItem value="auto">Auto-suggest</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            icon={<Type className="w-4 h-4" />}
            title="Text Output"
            description={textOutputMode === "paste" 
              ? "Text is pasted instantly from clipboard" 
              : "Text is typed character by character"
            }
          >
            <Select value={textOutputMode} onValueChange={(v) => handleTextOutputModeChange(v as "paste" | "typewriter" | "typewriter-leetcode")}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paste">Instant paste</SelectItem>
                <SelectItem value="typewriter">Typewriter</SelectItem>
                <SelectItem value="typewriter-leetcode">Typewriter - LeetCode</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            icon={<Sparkles className="w-4 h-4" />}
            title="Ghost Text Autocomplete"
            description="Inline AI suggestions as you type"
          >
            <Switch
              checked={ghostTextEnabled}
              onCheckedChange={handleGhostTextChange}
            />
          </SettingRow>

          {ghostTextEnabled && (
            <div className="py-4 pl-7">
              <SettingsCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-sm text-foreground">Auto-trigger</span>
                  </div>
                  <Switch
                    checked={ghostTextAutoTrigger}
                    onCheckedChange={handleAutoTriggerChange}
                  />
                </div>

                {ghostTextAutoTrigger && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Trigger delay</span>
                      <span className="text-xs font-medium text-foreground">{ghostTextAutoTriggerDelay}s</span>
                    </div>
                    <Slider
                      value={[ghostTextAutoTriggerDelay]}
                      onValueChange={handleAutoTriggerDelayChange}
                      min={0.5}
                      max={10}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-zinc-400">0.5s</span>
                      <span className="text-[10px] text-zinc-400">10s</span>
                    </div>
                  </div>
                )}
              </SettingsCard>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* Startup Section */}
      <SettingsSection title="Startup">
        <SettingRow
          icon={<Rocket className="w-4 h-4" />}
          title="Launch at login"
          description="Start Tabby automatically when you log in"
        >
          <Switch defaultChecked />
        </SettingRow>
      </SettingsSection>
    </SettingsPage>
  );
}
