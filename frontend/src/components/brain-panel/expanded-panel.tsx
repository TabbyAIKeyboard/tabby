"use client"

import { motion, AnimatePresence } from "motion/react"
import { Brain, ChevronUp, Eye, EyeOff, Settings, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Memory {
  id: string
  memory: string
  created_at: string
}

interface ExpandedPanelProps {
  memories: Memory[]
  captureEnabled: boolean
  isLearning: boolean
  recentActivity: string | null
  onCollapse: () => void
  onToggleCapture: (enabled: boolean) => void
}

export function ExpandedPanel({
  memories,
  captureEnabled,
  isLearning,
  recentActivity,
  onCollapse,
  onToggleCapture,
}: ExpandedPanelProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: -20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cn(
        "w-[300px] rounded-2xl overflow-hidden",
        "bg-background/80 backdrop-blur-xl",
        "border border-border/50",
        "shadow-2xl shadow-black/20"
      )}
    >
      <div
        className="h-5 bg-muted/40 cursor-move flex items-center justify-center border-b border-border/30"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
      </div>
      
      <PanelHeader isLearning={isLearning} memoryCount={memories.length} onCollapse={onCollapse} />
      
      <ActivityToast recentActivity={recentActivity} />
      
      <CaptureToggle captureEnabled={captureEnabled} onToggleCapture={onToggleCapture} />
      
      <MemoryList memories={memories} />
      
      <PanelFooter />
    </motion.div>
  )
}

function PanelHeader({
  isLearning,
  memoryCount,
  onCollapse,
}: {
  isLearning: boolean
  memoryCount: number
  onCollapse: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border/50">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-lg",
            "bg-muted border border-border/50",
            isLearning && "animate-pulse"
          )}
        >
          <Brain className="w-4 h-4 text-violet-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Brain</h3>
          <p className="text-xs text-muted-foreground">{memoryCount} memories</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCollapse}>
        <ChevronUp className="w-4 h-4" />
      </Button>
    </div>
  )
}

function ActivityToast({ recentActivity }: { recentActivity: string | null }) {
  return (
    <AnimatePresence>
      {recentActivity && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="px-4 py-2 bg-violet-500/10 border-b border-violet-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-violet-500 animate-pulse" />
              <span className="text-xs text-violet-600 dark:text-violet-400">
                {recentActivity}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CaptureToggle({
  captureEnabled,
  onToggleCapture,
}: {
  captureEnabled: boolean
  onToggleCapture: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
      <div className="flex items-center gap-2">
        {captureEnabled ? (
          <Eye className="w-4 h-4 text-green-500" />
        ) : (
          <EyeOff className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm">Context Capture</span>
      </div>
      <Switch checked={captureEnabled} onCheckedChange={onToggleCapture} />
    </div>
  )
}

function MemoryList({ memories }: { memories: Memory[] }) {
  return (
    <ScrollArea className="h-[200px]">
      <div className="p-3 space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground px-1">Recent Memories</h4>
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Brain className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-xs">No memories yet</p>
          </div>
        ) : (
          memories.map((memory, i) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "p-2.5 rounded-lg text-xs",
                "bg-muted/50 hover:bg-muted/80",
                "border border-transparent hover:border-border/50",
                "transition-colors cursor-default"
              )}
            >
              <p className="line-clamp-2">{memory.memory}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(memory.created_at).toLocaleString()}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}

function PanelFooter() {
  return (
    <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
      <span>Ctrl+Shift+B to toggle</span>
      <button
        onClick={() => window.electron?.openSettings?.()}
        className="hover:text-foreground transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
