"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AnalyzingLoadingProps {
  className?: string;
  isCapturing?: boolean;
}

export function AnalyzingLoading({ className, isCapturing }: AnalyzingLoadingProps) {
  const detectionBoxes = [
    { top: "10%", left: "10%", width: "35%", height: "25%" },
    { top: "40%", left: "50%", width: "40%", height: "30%" },
    { top: "75%", left: "20%", width: "25%", height: "15%" },
  ];

  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="relative h-32 w-48">
        <div className="absolute inset-0 rounded-lg border-2 border-border/50 bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm">
          <div className="absolute inset-2 overflow-hidden rounded">
            <motion.div
              className="absolute inset-x-0 h-[30%] bg-gradient-to-b from-transparent via-primary/20 to-transparent"
              animate={{ top: ["-30%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="absolute inset-0 opacity-30">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-px w-full bg-primary/40"
                  style={{ top: `${(i + 1) * 15}%` }}
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>

            {detectionBoxes.map((box, i) => (
              <motion.div
                key={i}
                className="absolute rounded border border-primary/60"
                style={box}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.8, 1, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: i * 0.4,
                }}
              >
                <motion.div
                  className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {isCapturing && (
          <motion.div
            className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <svg
              className="h-4 w-4 text-primary-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </motion.div>
        )}

        {!isCapturing && (
          <motion.div
            className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30"
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                "0 0 0 0 rgba(var(--primary-rgb), 0.4)",
                "0 0 20px 4px rgba(var(--primary-rgb), 0.2)",
                "0 0 0 0 rgba(var(--primary-rgb), 0.4)",
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg
              className="h-4 w-4 text-primary-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2a8 8 0 0 1 8 8c0 3.5-2.5 6.5-6 7.5V22h-4v-4.5c-3.5-1-6-4-6-7.5a8 8 0 0 1 8-8z" />
              <circle cx="9" cy="9" r="1" fill="currentColor" />
              <circle cx="15" cy="9" r="1" fill="currentColor" />
              <path d="M9 13h6" />
            </svg>
          </motion.div>
        )}

        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-primary/60"
              style={{
                left: `${10 + (i * 10) % 80}%`,
                top: `${10 + ((i * 15) % 80)}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                x: [0, (i % 2 === 0 ? 10 : -10)],
                y: [0, (i % 2 === 0 ? -10 : 10)],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
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
        <span className="text-sm font-medium text-foreground">
          {isCapturing ? "Capturing Screen" : "AI Analyzing"}
        </span>
        <div className="flex items-center gap-2">
          <div className="relative h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="absolute h-full w-1/3 rounded-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"
              animate={{ left: ["-33%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {isCapturing ? "Reading screen content..." : "Understanding the problem..."}
        </span>
      </motion.div>
    </div>
  );
}
