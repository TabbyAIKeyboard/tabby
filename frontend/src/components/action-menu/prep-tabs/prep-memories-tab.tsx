"use client";

import { MessageSquare, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { PrepAnalysis } from "@/lib/ai/types";

interface PrepMemoriesTabProps {
  memories: Array<{ memory?: string; createdAt?: string }>;
}

export function PrepMemoriesTab({ memories }: PrepMemoriesTabProps) {
  if (memories.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground p-6">
        <Brain className="mb-4 h-10 w-10 opacity-40" />
        <p className="text-sm">No memories found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="space-y-3">
        {memories.map((mem, i) => (
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
