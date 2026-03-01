"use client";

import { GitBranch, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrepSimilarTabProps {
  similar?: Array<{ name: string; slug?: string; reason: string }>;
}

const openExternal = (url: string) => {
  if (typeof window !== "undefined" && window.electron?.openExternal) {
    window.electron.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

export function PrepSimilarTab({ similar }: PrepSimilarTabProps) {
  if (!similar || similar.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground p-6">
        <GitBranch className="mb-4 h-10 w-10 opacity-40" />
        <p className="text-sm">No similar problems found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="space-y-3">
        {similar.map((problem, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/50 bg-card/50 p-4 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{problem.name}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{problem.reason}</p>
              </div>
              {problem.slug && (
                <button
                  onClick={() => openExternal(`https://leetcode.com/problems/${problem.slug}`)}
                  className="ml-3 flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
