"use client";

import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getApiUrl } from "@/lib/api-url";

// Neutral grayscale colors for the pie chart
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const chartConfig = {
  "Code Completion": {
    label: "Code Completion",
    color: CHART_COLORS[0],
  },
  Chat: {
    label: "Chat",
    color: CHART_COLORS[1],
  },
  Voice: {
    label: "Voice",
    color: CHART_COLORS[2],
  },
  Transcribe: {
    label: "Transcribe",
    color: CHART_COLORS[3],
  },
  Other: {
    label: "Other",
    color: CHART_COLORS[4],
  },
};

interface DistributionData {
  name: string;
  value: number;
  fill: string;
}

async function fetchDistribution(): Promise<DistributionData[]> {
  const res = await fetch(getApiUrl("/api/dashboard/analytics?period=day"), {
    credentials: "include",
  });
  const data = await res.json();
  if (!data.success) throw new Error("Failed to fetch distribution");
  return data.data.distribution;
}

export function AnalyticsChart() {
  const { data: distribution = [], isLoading } = useQuery({
    queryKey: ["analytics-distribution"],
    queryFn: fetchDistribution,
    refetchInterval: 60000, // Refresh every minute
  });

  const total = distribution.reduce((sum, item) => sum + item.value, 0);

  // Override fills with neutral colors
  const neutralDistribution = distribution.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">Usage Distribution</h3>
        <p className="text-sm text-muted-foreground">
          Feature usage breakdown
        </p>
      </div>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          Loading chart...
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <ChartContainer config={chartConfig} className="h-[180px] w-[180px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={neutralDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                strokeWidth={2}
                stroke="var(--background)"
              >
                {neutralDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="flex-1 space-y-2">
            {neutralDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium">
                  {((item.value / total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
