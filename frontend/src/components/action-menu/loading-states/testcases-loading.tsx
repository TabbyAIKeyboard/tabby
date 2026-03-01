"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TestCasesLoadingProps {
  className?: string;
}

export function TestCasesLoading({ className }: TestCasesLoadingProps) {
  const tubes = [
    { height: "h-16", color: "from-green-400/60 to-green-500/40", delay: 0 },
    { height: "h-20", color: "from-blue-400/60 to-blue-500/40", delay: 0.2 },
    { height: "h-14", color: "from-purple-400/60 to-purple-500/40", delay: 0.4 },
    { height: "h-18", color: "from-amber-400/60 to-amber-500/40", delay: 0.6 },
  ];

  const statuses = [
    { label: "Pass", color: "bg-green-400" },
    { label: "Fail", color: "bg-red-400" },
    { label: "Edge", color: "bg-yellow-400" },
  ];

  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="relative flex items-end gap-3">
        {tubes.map((tube, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: tube.delay,
            }}
          >
            <div
              className={cn(
                "relative w-7 overflow-hidden rounded-b-full border-2 border-t-0 border-border/40 bg-card/40 backdrop-blur-sm",
                tube.height
              )}
            >
              <motion.div
                className={cn(
                  "absolute bottom-0 left-0 right-0 rounded-b-full bg-gradient-to-t",
                  tube.color
                )}
                animate={{ height: ["20%", "70%", "20%"] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: tube.delay,
                }}
              />
              
              {[0, 1, 2].map((bubble) => (
                <motion.div
                  key={bubble}
                  className="absolute h-1 w-1 rounded-full bg-white/60"
                  style={{ left: `${20 + bubble * 25}%`, bottom: "10%" }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: tube.delay + bubble * 0.3,
                  }}
                />
              ))}
            </div>
            
            <div className="h-1 w-8 rounded-t bg-border/60" />
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {statuses.map((status, i) => (
          <motion.div
            key={status.label}
            className="flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/30 px-3 py-1.5"
            animate={{
              opacity: [0.6, 1, 0.6],
              scale: [0.98, 1, 0.98],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          >
            <motion.div
              className={cn("h-2 w-2 rounded-full", status.color)}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
            <span className="text-[10px] font-medium text-muted-foreground">{status.label}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-6 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-sm font-medium text-foreground">Generating Test Cases</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3h6l3 6-3 12H9L6 9l3-6z" />
            <motion.path
              d="M12 9v6"
              animate={{ rotate: [0, 180, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ transformOrigin: "center" }}
            />
            <motion.circle
              cx="12"
              cy="18"
              r="1"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </svg>
          <span>Validating edge cases...</span>
        </div>
      </motion.div>
    </div>
  );
}
