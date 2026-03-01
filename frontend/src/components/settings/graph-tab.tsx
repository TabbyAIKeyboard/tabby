"use client";

import { useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import type { Node, Relationship, HitTargets } from "@neo4j-nvl/base";
import type { MouseEventCallbacks } from "@neo4j-nvl/react";
import { Brain, RefreshCw, AlertCircle, Share2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useUser from "@/hooks/use-user";
import { cn } from "@/lib/utils";

const InteractiveNvlWrapper = dynamic(
  () => import("@neo4j-nvl/react").then((mod) => mod.InteractiveNvlWrapper),
  { ssr: false }
);

interface Relation {
  source: string;
  relationship: string;
  target: string;
}

interface MemoriesResponse {
  success: boolean;
  memories: {
    results: unknown[];
    relations?: Relation[];
  };
}

const MEMORY_API_URL = process.env.NEXT_PUBLIC_MEMORY_API_URL || "http://localhost:8000";

async function fetchMemoriesWithRelations(userId: string): Promise<Relation[]> {
  const response = await fetch(`${MEMORY_API_URL}/memory/get_all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  const data: MemoriesResponse = await response.json();
  if (!data.success) throw new Error("Failed to fetch memories");
  return data.memories?.relations || [];
}

function formatLabel(label: string): string {
  return label
    .replace(/^user_id:_/, "")
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Sophisticated, muted palette for nodes
const NODE_COLORS = [
  "#a78bfa", // violet-400
  "#22d3ee", // cyan-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#f87171", // red-400
  "#f472b6", // pink-400
  "#818cf8"  // indigo-400
];

export function GraphTab() {
  const nvlRef = useRef<any>(null);
  const { data: user } = useUser();
  const userId = user?.id;
  
  const { data: relations = [], isLoading, error, refetch } = useQuery({
    queryKey: ["memory-relations", userId],
    queryFn: () => fetchMemoriesWithRelations(userId!),
    enabled: !!userId,
  });

  const { nodes, rels } = useMemo(() => {
    const nodeSet = new Set<string>();
    relations.forEach((r) => {
      nodeSet.add(r.source);
      nodeSet.add(r.target);
    });

    const nodeArray = Array.from(nodeSet);
    const centerX = 400;
    const centerY = 300;
    const radius = 250;
    
    const nodes: Node[] = nodeArray.map((id, index) => {
      const angle = (2 * Math.PI * index) / nodeArray.length;
      return {
        id,
        size: id.startsWith("user_id:") ? 40 : 25,
        color: NODE_COLORS[index % NODE_COLORS.length],
        caption: formatLabel(id),
        captions: [{ value: formatLabel(id), styles: ['bold'] }],
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    const rels: Relationship[] = relations.map((r, index) => ({
      id: `rel-${index}`,
      from: r.source,
      to: r.target,
      caption: r.relationship,
      width: 1.5,
      color: "#52525b" // zinc-600
    }));

    return { nodes, rels };
  }, [relations]);

  useEffect(() => {
    if (nvlRef.current && nodes.length > 0) {
      const timer = setTimeout(() => {
        try {
          nvlRef.current?.fit();
        } catch (e) {
          console.log("fit error:", e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nodes.length]);

  const mouseEventCallbacks: MouseEventCallbacks = {
    onHover: (element: Node | Relationship, hitTargets: HitTargets, evt: MouseEvent) => {},
    onNodeClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) => {
      console.log("Node clicked:", node);
    },
    onNodeDoubleClick: (node: Node, hitTargets: HitTargets, evt: MouseEvent) => {},
    onRelationshipClick: (rel: Relationship, hitTargets: HitTargets, evt: MouseEvent) => {},
    onDrag: (nodes: Node[], evt: MouseEvent) => {},
    onPan: (pan: { x: number; y: number }, evt: MouseEvent) => {},
    onZoom: (zoom: number, evt: MouseEvent) => {},
  };

  const handleZoomIn = () => {
      if (nvlRef.current) {
          const currentZoom = nvlRef.current.getScale(); 
          nvlRef.current.setZoom(currentZoom * 1.2); 
      }
  };

  const handleZoomOut = () => {
    if (nvlRef.current) {
        const currentZoom = nvlRef.current.getScale();
        nvlRef.current.setZoom(currentZoom * 0.8);
    }
  };
  
  const handleFit = () => {
    nvlRef.current?.fit();
  }

  // Loading State
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800">
             <RefreshCw className="w-6 h-6 animate-spin text-zinc-400 mb-2" />
             <p className="text-sm text-muted-foreground">Generating Neural Map...</p>
        </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-lg border border-red-100 dark:border-red-900/30">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Unable to visualize knowledge graph</span>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          Retry Connection
        </Button>
      </div>
    );
  }

  // Empty State
  if (nodes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-2 ring-1 ring-zinc-200 dark:ring-zinc-700/50">
            <Share2 className="w-6 h-6 text-zinc-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Graph Empty</h3>
        <p className="text-sm">Knowledge relationships will appear here as you interact.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950">
      {/* Floating Header */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-lg">
           <div className="flex items-center gap-2 mb-1">
             <Brain className="w-4 h-4 text-violet-500" />
             <h2 className="font-semibold text-sm">Knowledge Graph</h2>
           </div>
           <p className="text-[10px] text-muted-foreground font-mono">
             {nodes.length} ENTITIES • {rels.length} CONNECTIONS
           </p>
        </div>
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
         <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-lg flex flex-col gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={handleFit} title="Fit to Screen">
                <Maximize2 className="w-4 h-4" />
            </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => refetch()} title="Refresh Data">
                <RefreshCw className="w-4 h-4" />
            </Button>
         </div>
      </div>

      <div className="flex-1 w-full h-full">
        <InteractiveNvlWrapper
          ref={nvlRef}
          nodes={nodes}
          rels={rels}
          mouseEventCallbacks={mouseEventCallbacks}
          nvlOptions={{
            allowDynamicMinZoom: true,
            initialZoom: 1,
            layout: "forceDirected",
          }}
        />
      </div>
    </div>
  );
}
