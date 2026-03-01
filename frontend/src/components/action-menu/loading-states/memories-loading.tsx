"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface MemoriesLoadingProps {
  className?: string;
}

export function MemoriesLoading({ className }: MemoriesLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="relative flex flex-col items-center">
        <motion.div
          className="relative mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-sm">
            <svg
              className="h-8 w-8 text-violet-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <motion.path
                d="M12 2a8 8 0 0 1 8 8c0 3.5-2.5 6.5-6 7.5V22h-4v-4.5c-3.5-1-6-4-6-7.5a8 8 0 0 1 8-8z"
                animate={{ pathLength: [0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <circle cx="9" cy="9" r="1" fill="currentColor" />
              <circle cx="15" cy="9" r="1" fill="currentColor" />
            </svg>
          </div>

          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute h-6 w-10 rounded border border-violet-400/30 bg-card/60 backdrop-blur-sm"
              style={{
                left: `${-20 + i * 25}px`,
                top: "-8px",
              }}
              initial={{ opacity: 0, y: 20, rotate: (i - 1) * 10 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [20, -30, -35, -40],
                rotate: [(i - 1) * 10, (i - 1) * 5],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.4,
              }}
            >
              <div className="flex h-full items-center justify-center">
                <div className="h-1 w-6 rounded bg-violet-400/40" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="flex items-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-violet-400"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>

      <motion.div
        className="mt-6 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-sm font-medium text-foreground">Searching Memories</span>
        <span className="text-xs text-muted-foreground">Looking for your preferences...</span>
      </motion.div>
    </div>
  );
}
