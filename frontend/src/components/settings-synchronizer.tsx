"use client";

import { useEffect } from "react";

const STORAGE_KEYS = {
  SUGGESTION_MODE: "ai-keyboard-suggestion-mode",
  TEXT_OUTPUT_MODE: "ai-keyboard-text-output-mode",
  GHOST_TEXT_ENABLED: "ai-keyboard-ghost-text-enabled",
  GHOST_TEXT_AUTO_TRIGGER: "ai-keyboard-ghost-text-auto-trigger",
  GHOST_TEXT_AUTO_TRIGGER_DELAY: "ai-keyboard-ghost-text-auto-trigger-delay",
  DEFAULT_MODEL: "ai-keyboard-default-model",
  DEFAULT_FAST_MODEL: "ai-keyboard-default-fast-model",
};

/**
 * Syncs localStorage settings to the Electron main process on app startup.
 * This ensures settings are applied without needing to visit the settings page.
 */
export function SettingsSynchronizer() {
  useEffect(() => {
    // Only run in Electron environment
    if (typeof window === "undefined" || !window.electron) return;

    console.log("[SettingsSynchronizer] Syncing settings to main process...");

    // Sync suggestion mode
    const storedSuggestionMode = localStorage.getItem(STORAGE_KEYS.SUGGESTION_MODE);
    if (storedSuggestionMode) {
      window.electron.setSuggestionMode?.(storedSuggestionMode as "hotkey" | "auto");
    }

    // Sync text output mode
    const storedTextOutputMode = localStorage.getItem(STORAGE_KEYS.TEXT_OUTPUT_MODE);
    if (storedTextOutputMode) {
      window.electron.setTextOutputMode?.(storedTextOutputMode as "paste" | "typewriter" | "typewriter-leetcode");
    }

    // Sync ghost text enabled
    const storedGhostText = localStorage.getItem(STORAGE_KEYS.GHOST_TEXT_ENABLED);
    if (storedGhostText) {
      const enabled = storedGhostText === "true";
      window.electron.setGhostTextEnabled?.(enabled);
    }

    // Sync auto-trigger settings
    const storedAutoTrigger = localStorage.getItem(STORAGE_KEYS.GHOST_TEXT_AUTO_TRIGGER);
    if (storedAutoTrigger) {
      const enabled = storedAutoTrigger === "true";
      window.electron.setGhostTextAutoTrigger?.(enabled);
    }

    const storedAutoTriggerDelay = localStorage.getItem(STORAGE_KEYS.GHOST_TEXT_AUTO_TRIGGER_DELAY);
    if (storedAutoTriggerDelay) {
      const delay = parseInt(storedAutoTriggerDelay, 10);
      window.electron.setGhostTextAutoTriggerDelay?.(delay * 1000); // Convert to ms
    }

    // Sync model settings
    const storedDefaultModel = localStorage.getItem(STORAGE_KEYS.DEFAULT_MODEL);
    if (storedDefaultModel) {
      window.electron.setDefaultModel?.(storedDefaultModel);
    }

    const storedFastModel = localStorage.getItem(STORAGE_KEYS.DEFAULT_FAST_MODEL);
    if (storedFastModel) {
      window.electron.setDefaultFastModel?.(storedFastModel);
    }

    console.log("[SettingsSynchronizer] Settings synced successfully");
  }, []);

  return null;
}
