"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-url";

const chartConfig = {
  completions: {
    label: "Completions",
    color: "var(--foreground)",
  },
};

type TimePeriod = "minute" | "hour" | "day";

interface AnalyticsData {
  timeSeries: { time: string; completions: number; latency: number }[];
  distribution: { name: string; value: number; fill: string }[];
}

async function fetchAnalytics(period: TimePeriod): Promise<AnalyticsData> {
  const res = await fetch(getApiUrl(`/api/dashboard/analytics?period=${period}`), {
    credentials: "include",
  });
  const data = await res.json();
  if (!data.success) throw new Error("Failed to fetch analytics");
  return data.data;
}

export function CompletionsChart() {
  const [period, setPeriod] = useState<TimePeriod>("hour");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: () => fetchAnalytics(period),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const timeSeries = data?.timeSeries || [];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Tab Completions</h3>
          <p className="text-sm text-muted-foreground">
            Completions over time
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["minute", "hour", "day"] as TimePeriod[]).map((p) => (
            <Button
              key={p}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-xs capitalize",
                period === p && "bg-background shadow-sm"
              )}
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          Loading chart...
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart data={timeSeries} margin={{ left: 0, right: 0 }}>
            <defs>
              <linearGradient id="completionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickMargin={8}
              width={40}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="completions"
              stroke="var(--foreground)"
              strokeWidth={2}
              fill="url(#completionsGradient)"
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
