"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface CodeLoadingProps {
  className?: string;
}

export function CodeLoading({ className }: CodeLoadingProps) {
  const codeLines = [
    { width: "70%", delay: 0 },
    { width: "85%", delay: 0.1 },
    { width: "60%", delay: 0.2 },
    { width: "90%", delay: 0.3 },
    { width: "45%", delay: 0.4 },
  ];

  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="relative h-32 w-48 overflow-hidden rounded-lg border border-border/50 bg-muted/30 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 border-b border-border/30 bg-muted/50 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-red-400/70" />
          <div className="h-2 w-2 rounded-full bg-yellow-400/70" />
          <div className="h-2 w-2 rounded-full bg-green-400/70" />
          <div className="ml-2 h-2 w-12 rounded bg-muted-foreground/20" />
        </div>

        <div className="space-y-1.5 p-3">
          {codeLines.map((line, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: line.delay }}
            >
              <span className="text-[8px] font-mono text-muted-foreground/50 w-3">{i + 1}</span>
              <motion.div
                className="h-2 rounded bg-gradient-to-r from-primary/60 via-primary/40 to-transparent"
                style={{ width: line.width }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: line.delay }}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="absolute bottom-3 h-3 w-0.5 bg-primary"
          animate={{ x: [8, 180, 8], opacity: [1, 1, 0, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="mt-6 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <span className="text-sm font-medium text-foreground">Writing Code</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <motion.svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </motion.svg>
          <span className="font-mono">Generating solution...</span>
        </div>
      </motion.div>
    </div>
  );
}
