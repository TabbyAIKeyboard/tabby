"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface IdeaLoadingProps {
  className?: string;
}

export function IdeaLoading({ className }: IdeaLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="relative h-24 w-24">
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            className="h-12 w-12 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <motion.circle
              cx="12"
              cy="12"
              r="10"
              strokeOpacity="0.3"
              animate={{ strokeOpacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.path
              d="M12 6v6l4 2"
              animate={{ pathLength: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>

        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.75,
            }}
          >
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 -top-1"
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.375,
              }}
            >
              <div className="h-3 w-3 rounded-full bg-gradient-to-br from-primary/80 to-primary/40" />
            </motion.div>
          </motion.div>
        ))}

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <motion.line
              key={i}
              x1="50"
              y1="50"
              x2={50 + 35 * Math.cos((angle * Math.PI) / 180)}
              y2={50 + 35 * Math.sin((angle * Math.PI) / 180)}
              stroke="currentColor"
              strokeWidth="1"
              className="text-primary/30"
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </svg>
      </div>

      <motion.div
        className="mt-6 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-sm font-medium text-foreground">Brainstorming Ideas</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
