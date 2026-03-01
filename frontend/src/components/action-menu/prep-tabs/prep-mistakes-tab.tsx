"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrepMistakesTabProps {
  mistakes?: Array<{ mistake: string; correction: string; pattern: string }>;
}

export function PrepMistakesTab({ mistakes }: PrepMistakesTabProps) {
  if (!mistakes || mistakes.length === 0) {
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
        {mistakes.map((item, i) => (
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
                  <p className="text-sm text-foreground">{item.mistake}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Correction</p>
                  <p className="text-sm text-foreground">{item.correction}</p>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {item.pattern}
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
