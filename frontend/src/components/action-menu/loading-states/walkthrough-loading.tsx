"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface WalkthroughLoadingProps {
  className?: string;
}

export function WalkthroughLoading({ className }: WalkthroughLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="relative flex items-center gap-3">
        {[1, 2, 3, 4].map((step, i) => (
          <div key={step} className="flex items-center">
            <motion.div
              className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(var(--primary-rgb), 0.4)",
                  "0 0 0 8px rgba(var(--primary-rgb), 0)",
                  "0 0 0 0 rgba(var(--primary-rgb), 0.4)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
            >
              <motion.div
                className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/40 to-primary/10"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
              />
              <motion.span
                className="relative z-10 text-sm font-semibold text-primary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.3 }}
              >
                {step}
              </motion.span>
            </motion.div>

            {i < 3 && (
              <div className="relative mx-1 h-0.5 w-6 overflow-hidden bg-border/30">
                <motion.div
                  className="absolute h-full w-full bg-gradient-to-r from-primary to-primary/50"
                  animate={{ x: ["-100%", "0%", "-100%"] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.5,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="relative mt-8 h-20 w-32">
        {[0, 1, 2].map((page, i) => (
          <motion.div
            key={page}
            className="absolute left-1/2 top-0 h-16 w-24 rounded border border-border/40 bg-card/80 shadow-sm backdrop-blur-sm"
            style={{
              zIndex: 3 - i,
            }}
            initial={{ x: "-50%", y: i * 4, rotate: (i - 1) * 3 }}
            animate={{
              y: [i * 4, i * 4 - 2, i * 4],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          >
            <div className="space-y-1 p-2">
              <div className="h-1 w-12 rounded bg-muted-foreground/20" />
              <div className="h-1 w-16 rounded bg-muted-foreground/15" />
              <div className="h-1 w-10 rounded bg-muted-foreground/10" />
            </div>
          </motion.div>
        ))}

        <motion.div
          className="absolute inset-0 rounded bg-gradient-to-t from-primary/10 to-transparent"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      <motion.div
        className="mt-6 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="text-sm font-medium text-foreground">Creating Walkthrough</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
            <motion.path
              d="M9 12l2 2 4-4"
              strokeDasharray="20"
              animate={{ strokeDashoffset: [20, 0, 20] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </svg>
          <span>Step-by-step explanation</span>
        </div>
      </motion.div>
    </div>
  );
}
