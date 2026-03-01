"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemoryTab } from "@/components/settings/memory-tab";
import { GraphTab } from "@/components/settings/graph-tab";
import { Brain, Network } from "lucide-react";

export default function PreferencesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Preferences</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage your memories and knowledge graph
          </p>
        </div>

        <Tabs defaultValue="memory" className="w-full">
          <TabsList className="bg-muted/50 p-1 h-auto rounded-lg border border-border/50 mb-6">
            <TabsTrigger
              value="memory"
              className="px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Memories
            </TabsTrigger>
            <TabsTrigger
              value="graph"
              className="px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all flex items-center gap-2"
            >
              <Network className="h-4 w-4" />
              Knowledge Graph
            </TabsTrigger>
          </TabsList>

          <TabsContent value="memory" className="mt-0">
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
              <MemoryTab />
            </div>
          </TabsContent>

          <TabsContent value="graph" className="mt-0">
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden h-[600px]">
              <GraphTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
