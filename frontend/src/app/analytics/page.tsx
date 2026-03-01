"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
  Users,
} from "lucide-react";
import { getApiUrl } from "@/lib/api-url";

type TimePeriod = "minute" | "hour" | "day";

interface AnalyticsData {
  timeSeries: { time: string; completions: number; latency: number }[];
  distribution: { name: string; value: number; fill: string }[];
}

interface StatsData {
  totalCompletions: number;
  completionsChange: number;
  avgLatency: number;
  latencyChange: number;
  activeSessions: number;
  sessionsChange: number;
  successRate: number;
  successRateChange: number;
}

async function fetchAnalytics(period: TimePeriod): Promise<AnalyticsData> {
  const res = await fetch(getApiUrl(`/api/dashboard/analytics?period=${period}`), {
    credentials: "include",
  });
  const data = await res.json();
  if (!data.success) throw new Error("Failed to fetch analytics");
  return data.data;
}

async function fetchStats(): Promise<StatsData> {
  const res = await fetch(getApiUrl("/api/dashboard/stats"), {
    credentials: "include",
  });
  const data = await res.json();
  if (!data.success) throw new Error("Failed to fetch stats");
  return data.data;
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  change: number;
  icon: any;
  iconColor: string;
}) {
  const isPositive = change > 0;
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            isPositive ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>
    </div>
  );
}

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#6b7280"];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<TimePeriod>("hour");

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: () => fetchAnalytics(period),
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  const timeSeries = analytics?.timeSeries || [];
  const distribution = analytics?.distribution || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor your AI Keyboard performance and usage
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minute">Last Hour</SelectItem>
              <SelectItem value="hour">Last 24 Hours</SelectItem>
              <SelectItem value="day">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Completions"
            value={statsLoading ? "..." : stats?.totalCompletions.toLocaleString() || "0"}
            change={stats?.completionsChange || 0}
            icon={Zap}
            iconColor="bg-blue-500/10 text-blue-500"
          />
          <StatCard
            title="Avg Latency"
            value={statsLoading ? "..." : `${stats?.avgLatency || 0}ms`}
            change={stats?.latencyChange || 0}
            icon={Clock}
            iconColor="bg-amber-500/10 text-amber-500"
          />
          <StatCard
            title="Active Sessions"
            value={statsLoading ? "..." : stats?.activeSessions.toString() || "0"}
            change={stats?.sessionsChange || 0}
            icon={Users}
            iconColor="bg-emerald-500/10 text-emerald-500"
          />
          <StatCard
            title="Success Rate"
            value={statsLoading ? "..." : `${stats?.successRate || 0}%`}
            change={stats?.successRateChange || 0}
            icon={Activity}
            iconColor="bg-violet-500/10 text-violet-500"
          />
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-muted/50 p-1 h-auto rounded-lg border border-border/50">
            <TabsTrigger
              value="overview"
              className="px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Performance
            </TabsTrigger>
            <TabsTrigger
              value="distribution"
              className="px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Distribution
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Completions Area Chart */}
              <div className="rounded-xl border border-border/50 bg-card p-5">
                <h3 className="font-medium mb-4">Completions Over Time</h3>
                {analyticsLoading ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={timeSeries}>
                      <defs>
                        <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completions"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorCompletions)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Usage Distribution Pie */}
              <div className="rounded-xl border border-border/50 bg-card p-5">
                <h3 className="font-medium mb-4">Usage Distribution</h3>
                {analyticsLoading ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ResponsiveContainer width="50%" height={250}>
                      <PieChart>
                        <Pie
                          data={distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {distribution.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-muted-foreground">{item.name}</span>
                          </div>
                          <span className="font-medium">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="font-medium mb-4">Latency Trends</h3>
              {analyticsLoading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      name="Latency (ms)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="completions"
                      name="Completions"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="font-medium mb-4">Feature Usage Breakdown</h3>
              {analyticsLoading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
