"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  trend = "neutral",
  className,
}: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  const trendBg =
    trend === "up"
      ? "bg-emerald-100 dark:bg-emerald-500/15"
      : trend === "down"
        ? "bg-rose-100 dark:bg-rose-500/15"
        : "bg-muted";

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-foreground/20",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {change !== undefined && (
            <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", trendBg, trendColor)}>
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="rounded-lg bg-muted p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
