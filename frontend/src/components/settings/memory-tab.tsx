"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Brain, 
  Trash2, 
  RefreshCw, 
  Search, 
  AlertCircle, 
  Plus,
  Database,
  Clock,
  History,
  BookOpen,
  ListChecks,
  HelpCircle, 
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import useUser from "@/hooks/use-user";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface Memory {
  id: string;
  memory: string;
  hash: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  user_id: string;
}

interface GetAllMemoriesResponse {
  success: boolean;
  memories: {
    results: Memory[];
  };
}

interface SearchMemoriesResponse {
  success: boolean;
  results: {
    results: Memory[];
  };
}

const MEMORY_API_URL = process.env.NEXT_PUBLIC_MEMORY_API_URL || "http://localhost:8000";

async function fetchAllMemories(userId: string): Promise<Memory[]> {
  const response = await fetch(`${MEMORY_API_URL}/memory/get_all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  const data: GetAllMemoriesResponse = await response.json();
  if (!data.success) throw new Error("Failed to fetch memories");
  return data.memories?.results || [];
}

async function searchMemories({ query, userId }: { query: string; userId: string }): Promise<Memory[]> {
  const response = await fetch(`${MEMORY_API_URL}/memory/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, user_id: userId, limit: 20 }),
  });
  const data: SearchMemoriesResponse = await response.json();
  if (!data.success) throw new Error("Failed to search memories");
  return data.results?.results || [];
}

async function deleteMemory(memoryId: string): Promise<void> {
  const response = await fetch(`${MEMORY_API_URL}/memory/${memoryId}`, {
    method: "DELETE",
  });
  const data = await response.json();
  if (!data.success) throw new Error("Failed to delete memory");
}

async function deleteAllMemories(userId: string): Promise<void> {
  const response = await fetch(`${MEMORY_API_URL}/memory/user/${userId}`, {
    method: "DELETE",
  });
  const data = await response.json();
  if (!data.success) throw new Error("Failed to delete all memories");
}

async function addMemory({ content, userId }: { content: string; userId: string }): Promise<void> {
  const response = await fetch(`${MEMORY_API_URL}/memory/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content }],
      user_id: userId,
    }),
  });
  const data = await response.json();
  if (!data.success) throw new Error("Failed to add memory");
}

const MEMORY_TYPES_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  LONG_TERM: { 
    label: "Core Facts", 
    icon: Database, 
    color: "text-blue-500", 
    bg: "bg-blue-500/10", 
    border: "border-blue-500/20" 
  },
  SHORT_TERM: { 
    label: "Current Context", 
    icon: Clock, 
    color: "text-amber-500", 
    bg: "bg-amber-500/10", 
    border: "border-amber-500/20" 
  },
  EPISODIC: { 
    label: "Past Events", 
    icon: History, 
    color: "text-purple-500", 
    bg: "bg-purple-500/10", 
    border: "border-purple-500/20" 
  },
  SEMANTIC: { 
    label: "Knowledge Base", 
    icon: BookOpen, 
    color: "text-emerald-500", 
    bg: "bg-emerald-500/10", 
    border: "border-emerald-500/20" 
  },
  PROCEDURAL: { 
    label: "Workflow Rules", 
    icon: ListChecks, 
    color: "text-orange-500", 
    bg: "bg-orange-500/10", 
    border: "border-orange-500/20" 
  },
  UNCATEGORIZED: { 
    label: "Uncategorized", 
    icon: HelpCircle, 
    color: "text-zinc-500", 
    bg: "bg-zinc-500/10", 
    border: "border-zinc-500/20" 
  }
};

export function MemoryTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [newMemory, setNewMemory] = useState("");
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const userId = user?.id;

  const {
    data: memories = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["memories", userId],
    queryFn: () => fetchAllMemories(userId!),
    enabled: !!userId,
  });

  const searchMutation = useMutation({
    mutationFn: searchMemories,
    onSuccess: (results) => {
      queryClient.setQueryData(["memories", userId], results);
      setIsSearching(true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: (_, memoryId) => {
      queryClient.setQueryData(["memories", userId], (old: Memory[] = []) =>
        old.filter((m) => m.id !== memoryId)
      );
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllMemories(userId!),
    onSuccess: () => {
      queryClient.setQueryData(["memories", userId], []);
    },
  });

  const addMutation = useMutation({
    mutationFn: addMemory,
    onSuccess: () => {
      setNewMemory("");
      refetch();
    },
  });

  const handleAddMemory = () => {
    if (!newMemory.trim() || !userId) return;
    addMutation.mutate({ content: newMemory.trim(), userId });
  };

  const handleSearch = () => {
    if (!userId) return;
    if (!searchQuery.trim()) {
      setIsSearching(false);
      refetch();
      return;
    }
    searchMutation.mutate({ query: searchQuery, userId });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    refetch();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const groupedMemories = useMemo(() => {
    const groups: Record<string, Memory[]> = {
      LONG_TERM: [],
      SHORT_TERM: [],
      EPISODIC: [],
      SEMANTIC: [],
      PROCEDURAL: [],
      UNCATEGORIZED: []
    };

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

  const loading = isLoading || searchMutation.isPending;

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
            <Brain className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h2 className="font-semibold text-base">Memory Store</h2>
            <p className="text-xs text-muted-foreground">
              {memories.length} memories stored for {userId || "..."}
              {isSearching && " (filtered)"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleClearSearch();
            }}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                disabled={memories.length === 0 || deleteAllMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all memories?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {memories.length} memories. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAllMutation.mutate()}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          />
        </div>
        <Button onClick={handleSearch} variant="secondary" size="default">
          Search
        </Button>
        {isSearching && (
          <Button onClick={handleClearSearch} variant="outline" size="default">
            Clear
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add a new memory... (e.g., 'My favorite color is blue')"
          value={newMemory}
          onChange={(e) => setNewMemory(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddMemory()}
          className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
        />
        <Button 
          onClick={handleAddMemory} 
          disabled={!newMemory.trim() || addMutation.isPending || !userId}
          className="gap-1.5"
        >
          {addMutation.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Add
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to fetch memories. Make sure the backend is running.
        </div>
      )}

      <ScrollArea className="flex-1 -mx-2 px-2 h-[calc(100%-9rem)]">
        {loading && memories.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading memories...
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Brain className="w-10 h-10 opacity-30" />
            <p className="text-sm">
              {isSearching ? "No memories match your search" : "No memories stored yet"}
            </p>
            <p className="text-xs">
              {isSearching
                ? "Try a different search term"
                : "Memories will appear here as you interact with the AI"}
            </p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={["LONG_TERM", "SHORT_TERM", "UNCATEGORIZED", "EPISODIC", "SEMANTIC", "PROCEDURAL"]} className="space-y-4">
            {Object.keys(MEMORY_TYPES_CONFIG).map((type) => {
              const config = MEMORY_TYPES_CONFIG[type];
              const groupMemories = groupedMemories[type] || [];
              
              if (groupMemories.length === 0) return null;

              const Icon = config.icon;

              return (
                <AccordionItem key={type} value={type} className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${config.bg} ${config.border} border`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <span className="font-medium text-sm">{config.label}</span>
                      <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5 min-w-5 flex justify-center">
                        {groupMemories.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-0">
                    <div className="space-y-2 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800 ml-3.5">
                      {groupMemories.map((memory) => (
                        <div
                          key={memory.id}
                          className="group relative p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors ml-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground leading-relaxed">
                                {memory.memory}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1.5">
                                {formatDate(memory.created_at)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 absolute top-2 right-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(memory.id);
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending && deleteMutation.variables === memory.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </ScrollArea>
    </div>
  );
}
