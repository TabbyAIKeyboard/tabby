"use client"

import { motion } from "motion/react"
import { Brain, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsedBrainProps {
  isLearning: boolean
  captureEnabled: boolean
  onExpand: () => void
}

export function CollapsedBrain({ isLearning, captureEnabled, onExpand }: CollapsedBrainProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="cursor-move"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onExpand}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          "bg-background/80 backdrop-blur-xl border border-border/50",
          "shadow-lg shadow-black/10",
          "cursor-pointer transition-all duration-300",
          "hover:border-violet-400/60",
          isLearning && "animate-pulse"
        )}
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <div className="relative">
          <Brain
            className={cn(
              "w-6 h-6 text-violet-400",
              isLearning && "text-violet-300"
            )}
          />

          {isLearning && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="w-3 h-3 text-yellow-400" />
            </motion.div>
          )}

          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background",
              captureEnabled ? "bg-green-500" : "bg-zinc-500"
            )}
          />
        </div>
      </motion.button>
    </motion.div>
  )
}
