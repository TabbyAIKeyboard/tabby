"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  Timer,
  Users,
  CheckCircle2,
  Coins,
  Brain,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { CompletionsChart } from "@/components/dashboard/completions-chart";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { UserProfileCard } from "@/components/dashboard/user-profile-card";
import { UserMemoriesPanel } from "@/components/dashboard/user-memories-panel";
import { WelcomeSection } from "@/components/dashboard/welcome-section";
import { getApiUrl } from "@/lib/api-url";

interface DashboardStats {
  totalCompletions: number;
  completionsChange: number;
  avgLatency: number;
  latencyChange: number;
  activeSessions: number;
  sessionsChange: number;
  successRate: number;
  successRateChange: number;
  totalTokensUsed: number;
  tokensChange: number;
  memoriesStored: number;
  memoriesChange: number;
}

async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(getApiUrl("/api/dashboard/stats"), {
    credentials: "include",
  });
  const data = await res.json();
  if (!data.success) throw new Error("Failed to fetch stats");
  return data.data;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[1600px] mx-auto">
        {/* Main Content - Left 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              title="Total Completions"
              value={isLoading ? "..." : formatNumber(stats?.totalCompletions || 0)}
              change={stats?.completionsChange}
              icon={Zap}
              trend={stats?.completionsChange && stats.completionsChange > 0 ? "up" : "down"}
            />
            <StatCard
              title="Avg Latency"
              value={isLoading ? "..." : `${stats?.avgLatency || 0}ms`}
              change={stats?.latencyChange}
              icon={Timer}
              trend={stats?.latencyChange && stats.latencyChange < 0 ? "up" : "down"}
            />
            <StatCard
              title="Active Sessions"
              value={isLoading ? "..." : stats?.activeSessions || 0}
              change={stats?.sessionsChange}
              icon={Users}
              trend={stats?.sessionsChange && stats.sessionsChange > 0 ? "up" : "neutral"}
            />
            <StatCard
              title="Success Rate"
              value={isLoading ? "..." : `${stats?.successRate || 0}%`}
              change={stats?.successRateChange}
              icon={CheckCircle2}
              trend={stats?.successRateChange && stats.successRateChange > 0 ? "up" : "down"}
            />
            <StatCard
              title="Tokens Used"
              value={isLoading ? "..." : formatNumber(stats?.totalTokensUsed || 0)}
              change={stats?.tokensChange}
              icon={Coins}
              trend={stats?.tokensChange && stats.tokensChange > 0 ? "up" : "neutral"}
            />
            <StatCard
              title="Memories Stored"
              value={isLoading ? "..." : stats?.memoriesStored || 0}
              change={stats?.memoriesChange}
              icon={Brain}
              trend={stats?.memoriesChange && stats.memoriesChange > 0 ? "up" : "neutral"}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CompletionsChart />
            <AnalyticsChart />
          </div>
        </div>

        {/* Right Sidebar - 1 column */}
        <div className="space-y-6">
          <UserProfileCard />
          <UserMemoriesPanel />
        </div>
      </div>
    </div>
  );
}
