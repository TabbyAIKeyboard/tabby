"use client";

import { useEffect, useRef } from "react";
import { getAllMemories, type MemoryResult } from "@/lib/ai/tools/memory/client";

/**
 * Initializes and caches user memories at app startup for low-latency inline suggestions.
 * Fetches LONG_TERM and SHORT_TERM memories and stores them in electron-store.
 */
export function MemoryInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeMemories = async () => {
      if (typeof window === "undefined" || !window.electron) return;

      try {
        const userId = await window.electron.getUserId();
        if (!userId) {
          console.log("[MemoryInitializer] No user ID, skipping memory cache");
          return;
        }

        console.log("[MemoryInitializer] Fetching memories for user:", userId);

        // Fetch LONG_TERM and SHORT_TERM memories in parallel
        const [longTermResult, shortTermResult] = await Promise.all([
          getAllMemories(userId, "LONG_TERM").catch((err) => {
            console.error("[MemoryInitializer] Failed to fetch LONG_TERM:", err);
            return { results: [] };
          }),
          getAllMemories(userId, "SHORT_TERM").catch((err) => {
            console.error("[MemoryInitializer] Failed to fetch SHORT_TERM:", err);
            return { results: [] };
          }),
        ]);

        console.log("[MemoryInitializer] LONG_TERM response:", longTermResult);
        console.log("[MemoryInitializer] SHORT_TERM response:", shortTermResult);

        // Response structure is { success, memories: { results: [...] } }
        const longTermMemories = longTermResult?.memories?.results || [];
        const shortTermMemories = shortTermResult?.memories?.results || [];

        // Extract memory strings
        const allMemories = [
          ...longTermMemories.map((m: MemoryResult) => m.memory),
          ...shortTermMemories.map((m: MemoryResult) => m.memory),
        ];

        console.log("[MemoryInitializer] Caching", allMemories.length, "memories");
        window.electron.setCachedMemories(allMemories);
      } catch (error) {
        console.error("[MemoryInitializer] Failed to initialize memories:", error);
      }
    };

    initializeMemories();
  }, []);

  return null;
}
