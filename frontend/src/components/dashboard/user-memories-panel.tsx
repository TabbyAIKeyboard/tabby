"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import useUser from "@/hooks/use-user";

interface Memory {
  id: string;
  memory: string;
  hash: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  user_id: string;
}

const MEMORY_API_URL = process.env.NEXT_PUBLIC_MEMORY_API_URL || "http://localhost:8000";

async function fetchAllMemories(userId: string): Promise<Memory[]> {
  const response = await fetch(`${MEMORY_API_URL}/memory/get_all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  const data = await response.json();
  if (!data.success) throw new Error("Failed to fetch memories");
  return data.memories?.results || [];
}

const MEMORY_TYPES: Record<string, string> = {
  LONG_TERM: "Core Facts",
  SHORT_TERM: "Current",
  EPISODIC: "Events",
  SEMANTIC: "Knowledge",
  PROCEDURAL: "Workflows",
  UNCATEGORIZED: "Other",
};

export function UserMemoriesPanel() {
  const { data: user } = useUser();
  const userId = user?.id;

  const {
    data: memories = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-memories", userId],
    queryFn: () => fetchAllMemories(userId!),
    enabled: !!userId,
  });

  const groupedMemories = useMemo(() => {
    const groups: Record<string, Memory[]> = {};
    Object.keys(MEMORY_TYPES).forEach((type) => {
      groups[type] = [];
    });

    memories.forEach((memory) => {
      const type = (memory.metadata?.memory_type as string) || "UNCATEGORIZED";
      if (groups[type]) {
        groups[type].push(memory);
      } else {
        groups["UNCATEGORIZED"].push(memory);
      }
    });

    return groups;
  }, [memories]);

  const memoryCounts = useMemo(() => {
    return Object.entries(groupedMemories)
      .filter(([_, mems]) => mems.length > 0)
      .map(([type, mems]) => ({
        type,
        label: MEMORY_TYPES[type],
        count: mems.length,
      }));
  }, [groupedMemories]);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-lg">Memories</h3>
          <p className="text-sm text-muted-foreground">
            {memories.length} stored
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Loading...
        </div>
      ) : memories.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
          <p>No memories yet</p>
          <p className="text-xs">Tabby will learn as you interact</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Memory type counts - clean grid without icons */}
          <div className="grid grid-cols-2 gap-3">
            {memoryCounts.slice(0, 6).map(({ type, label, count }) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5"
              >
                <span className="text-sm">{label}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {count}
                </span>
              </div>
            ))}
          </div>

          {/* Recent memories */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">Recent</p>
            <ScrollArea className="h-28">
              <div className="space-y-2">
                {memories.slice(0, 6).map((memory) => (
                  <div
                    key={memory.id}
                    className="text-sm text-muted-foreground line-clamp-2 p-3 rounded-lg bg-muted/30"
                  >
                    {memory.memory}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
