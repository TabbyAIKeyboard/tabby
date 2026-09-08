'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { RefreshCw, Download, Trash2, Database, LineChart, Users, ChevronRight } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { SettingsPage, SettingsSection, SettingsCard } from './settings-page'
import { cn } from '@/lib/utils'
import {
  clearSuggestionLog,
  getSuggestionLogEntries,
  getSuggestionLogPath,
  getSuggestionLogStats,
  getSuggestionLogUsers,
  parseStringList,
  toCsv,
  userLabel,
  OUTCOME_LABELS,
  UNATTRIBUTED_USER_ID,
  type SuggestionConditionStats,
  type SuggestionLogRow,
  type SuggestionLogUser,
  type SuggestionOutcome,
} from '@/lib/suggestion-log'

const TABLE_ROW_LIMIT = 200

// Radix needs a non-empty value, and every real id is a UUID, so this can't
// collide with a participant.
const ALL_USERS = '__all__'

// Categorical slots 1-4, validated for both surfaces (adjacent-pair CVD ΔE ≥ 8.4,
// normal-vision ΔE ≥ 19.8). Assigned in fixed order and never cycled.
const OUTCOME_SERIES: Array<{
  key: Exclude<SuggestionOutcome, never>
  dataKey: keyof SuggestionConditionStats
  label: string
  light: string
  dark: string
}> = [
  {
    key: 'accepted',
    dataKey: 'accepted',
    label: 'Accepted',
    light: '#2a78d6',
    dark: '#3987e5',
  },
  {
    key: 'dismissed_explicit',
    dataKey: 'dismissedExplicit',
    label: 'Dismissed (explicit)',
    light: '#eb6834',
    dark: '#d95926',
  },
  {
    key: 'dismissed_implicit',
    dataKey: 'dismissedImplicit',
    label: 'Dismissed (implicit)',
    light: '#1baf7a',
    dark: '#199e70',
  },
  { key: 'pending', dataKey: 'pending', label: 'Pending', light: '#eda100', dark: '#c98500' },
]

const outcomeChartConfig = Object.fromEntries(
  OUTCOME_SERIES.map((series) => [
    series.dataKey,
    { label: series.label, theme: { light: series.light, dark: series.dark } },
  ])
) satisfies ChartConfig

const memoryTypeChartConfig = {
  shown: { label: 'Suggestions shown', theme: { light: '#2a78d6', dark: '#3987e5' } },
} satisfies ChartConfig

const dailyChartConfig = {
  kgGrounded: { label: 'KG-grounded', theme: { light: '#2a78d6', dark: '#3987e5' } },
  memoryFree: { label: 'Memory-free', theme: { light: '#eb6834', dark: '#d95926' } },
} satisfies ChartConfig

// ─── Formatting helpers ──────────────────────────────────────────

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function formatMs(value: number | null): string {
  if (value === null) return '—'
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`
}

function formatNumber(value: number | null, digits = 2): string {
  return value === null ? '—' : value.toFixed(digits)
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ─── Pieces ──────────────────────────────────────────────────────

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>}
    </div>
  )
}

/**
 * Acceptance rate for one memory condition, with a meter so the two cards can
 * be compared at a glance. The rate is also printed, so identity never rests
 * on the bar alone.
 */
function ConditionCard({
  title,
  description,
  stats,
  accent,
}: {
  title: string
  description: string
  stats: SuggestionConditionStats
  accent: string
}) {
  const rate = stats.acceptanceRate ?? 0

  return (
    <SettingsCard className="flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>
        </div>
        <Badge variant="outline" className="tabular-nums flex-shrink-0">
          n={stats.total}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {formatPercent(stats.acceptanceRate)}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {stats.accepted}/{stats.total} accepted
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(rate * 100, 100)}%`, backgroundColor: accent }}
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Accepted as-is</dt>
          <dd className="tabular-nums text-foreground">{stats.acceptedAsIs}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Accepted, edited</dt>
          <dd className="tabular-nums text-foreground">{stats.acceptedEdited}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Median decision</dt>
          <dd className="tabular-nums text-foreground">{formatMs(stats.medianTimeToDecisionMs)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Mean edit dist.</dt>
          <dd className="tabular-nums text-foreground">{formatNumber(stats.meanEditDistance)}</dd>
        </div>
      </dl>
    </SettingsCard>
  )
}

function ChartLegend({
  items,
}: {
  items: Array<{ label: string; light: string; dark: string; value?: number }>
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
        >
          <span
            className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0 dark:hidden"
            style={{ backgroundColor: item.light }}
          />
          <span
            className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0 hidden dark:inline-block"
            style={{ backgroundColor: item.dark }}
          />
          {item.label}
          {item.value !== undefined && (
            <span className="tabular-nums text-zinc-500 dark:text-zinc-500">({item.value})</span>
          )}
        </span>
      ))}
    </div>
  )
}

function OutcomeBadge({ outcome }: { outcome: SuggestionOutcome }) {
  const tone: Record<SuggestionOutcome, string> = {
    accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dismissed_explicit: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dismissed_implicit: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }

  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-medium',
        tone[outcome]
      )}
    >
      {OUTCOME_LABELS[outcome] ?? outcome}
    </span>
  )
}

function EmptyState({ logPath, scoped }: { logPath?: string; scoped?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-12 text-center">
      <LineChart className="w-6 h-6 mx-auto text-zinc-400 dark:text-zinc-600" />
      <p className="mt-3 text-sm font-medium text-foreground">
        {scoped ? 'No suggestions for this participant' : 'No suggestions logged yet'}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
        {scoped
          ? 'Pick another participant, or switch to All participants to see the pooled log.'
          : 'Ghost-text suggestions are recorded as soon as one is shown. Turn on ghost text, type in another app, and come back here.'}
      </p>
      {logPath && (
        <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-600 break-all">{logPath}</p>
      )}
    </div>
  )
}

// ─── Tab ─────────────────────────────────────────────────────────

export function SuggestionsTab() {
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = React.useState<string>(ALL_USERS)

  // undefined scopes nothing - the query layer reads that as "every user".
  const scopedUserId = selectedUser === ALL_USERS ? undefined : selectedUser

  const { data: users = [] } = useQuery({
    queryKey: ['suggestion-log', 'users'],
    queryFn: getSuggestionLogUsers,
    refetchInterval: 30000,
  })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['suggestion-log', 'stats', selectedUser],
    queryFn: () => getSuggestionLogStats(scopedUserId),
    refetchInterval: 30000,
  })

  const { data: entries = [] } = useQuery({
    queryKey: ['suggestion-log', 'entries', TABLE_ROW_LIMIT, selectedUser],
    queryFn: () => getSuggestionLogEntries(TABLE_ROW_LIMIT, scopedUserId),
    refetchInterval: 30000,
  })

  const { data: logPath } = useQuery({
    queryKey: ['suggestion-log', 'path'],
    queryFn: getSuggestionLogPath,
    staleTime: Infinity,
  })

  const clearMutation = useMutation({
    mutationFn: () => clearSuggestionLog(scopedUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suggestion-log'] }),
  })

  // Labels for the table's User column, so a row shows who produced it rather
  // than a bare UUID.
  const userLabels = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const user of users) map.set(user.userId, userLabel(user))
    return map
  }, [users])

  const totalAcrossUsers = React.useMemo(
    () => users.reduce((sum, user) => sum + user.total, 0),
    [users]
  )

  const selectedLabel =
    selectedUser === ALL_USERS ? 'all participants' : (userLabels.get(selectedUser) ?? selectedUser)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['suggestion-log'] })

  const handleExport = () => {
    const csv = toCsv(entries)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `suggestion-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const outcomeData = React.useMemo(() => {
    if (!stats) return []
    return [
      { condition: 'KG-grounded', ...stats.kgGrounded },
      { condition: 'Memory-free', ...stats.memoryFree },
    ]
  }, [stats])

  const memoryTypeData = React.useMemo(
    () =>
      (stats?.memoryTypes ?? []).map((entry) => ({
        ...entry,
        rate: entry.shown ? entry.accepted / entry.shown : 0,
      })),
    [stats]
  )

  const [expandedRows, setExpandedRows] = React.useState<ReadonlySet<string>>(new Set())

  const toggleRow = (id: string) =>
    setExpandedRows((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const hasData = (stats?.total ?? 0) > 0
  const showDaily = (stats?.daily.length ?? 0) > 1
  // Only worth a column when rows can come from more than one participant.
  const showUserColumn = selectedUser === ALL_USERS && users.length > 1
  const columnCount = showUserColumn ? 8 : 7

  return (
    <SettingsPage
      title="Suggestions"
      description="Ghost-text suggestions recorded on this machine, scoped to one participant or pooled across all of them."
      fullWidth
    >
      <div className="mx-auto max-w-5xl">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger size="sm" className="h-8 text-xs w-[200px]">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <SelectValue placeholder="All participants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_USERS}>All participants ({totalAcrossUsers})</SelectItem>
                {users.map((user: SuggestionLogUser) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {userLabel(user)} ({user.total})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 min-w-0">
              <Database className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {stats?.lastShownAt
                  ? `Last ${formatTimestamp(stats.lastShownAt)}`
                  : 'tabby.db · suggestion_log'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} className="h-8 text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={entries.length === 0}
              className="h-8 text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasData || clearMutation.isPending}
                  className="h-8 text-xs text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear the suggestion log?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes {stats?.total ?? 0} rows for {selectedLabel} from the
                    suggestion_log table. The JSONL file on disk is left untouched, so the data can
                    be re-imported on the next launch.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearMutation.mutate()}>
                    Clear log
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Loading suggestion log…
          </div>
        ) : !hasData ? (
          <EmptyState logPath={logPath} scoped={selectedUser !== ALL_USERS} />
        ) : (
          <>
            {/* Headline numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              <StatTile
                label="Suggestions"
                value={String(stats!.total)}
                detail={`${stats!.kgGrounded.total} KG · ${stats!.memoryFree.total} baseline`}
              />
              <StatTile
                label="Acceptance"
                value={formatPercent(stats!.overall.acceptanceRate)}
                detail={`${stats!.overall.accepted} accepted`}
              />
              <StatTile
                label="Median decision"
                value={formatMs(stats!.overall.medianTimeToDecisionMs)}
                detail={`mean ${formatMs(stats!.overall.meanTimeToDecisionMs)}`}
              />
              <StatTile
                label="Accepted as-is"
                value={formatPercent(
                  stats!.overall.accepted
                    ? stats!.overall.acceptedAsIs / stats!.overall.accepted
                    : null
                )}
                detail={`${stats!.overall.acceptedEdited} edited after accept`}
              />
            </div>

            {/* Condition comparison — the pilot's core contrast */}
            <SettingsSection
              title="Memory condition"
              description="Suggestions generated with the knowledge graph vs. the memory-free baseline."
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <ConditionCard
                  title="KG-grounded"
                  description="Retrieved memories were sent with the context"
                  stats={stats!.kgGrounded}
                  accent="#2a78d6"
                />
                <ConditionCard
                  title="Memory-free baseline"
                  description="Memory retrieval disabled for the request"
                  stats={stats!.memoryFree}
                  accent="#eb6834"
                />
              </div>
            </SettingsSection>

            {/* Outcome composition */}
            <SettingsSection
              title="Outcomes by condition"
              description="How each shown suggestion ended up."
            >
              <SettingsCard>
                <ChartContainer
                  config={outcomeChartConfig}
                  className="h-[160px] w-full aspect-auto"
                >
                  <BarChart
                    accessibilityLayer
                    data={outcomeData}
                    layout="vertical"
                    margin={{ left: 0, right: 12, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="condition"
                      tickLine={false}
                      axisLine={false}
                      width={96}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {OUTCOME_SERIES.map((series, index) => (
                      <Bar
                        key={series.dataKey}
                        dataKey={series.dataKey}
                        stackId="outcome"
                        fill={`var(--color-${series.dataKey})`}
                        stroke="var(--background)"
                        strokeWidth={2}
                        radius={index === OUTCOME_SERIES.length - 1 ? [0, 4, 4, 0] : 0}
                        barSize={28}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
                <ChartLegend
                  items={OUTCOME_SERIES.map((series) => ({
                    label: series.label,
                    light: series.light,
                    dark: series.dark,
                    value:
                      (stats!.kgGrounded[series.dataKey] as number) +
                      (stats!.memoryFree[series.dataKey] as number),
                  }))}
                />
              </SettingsCard>
            </SettingsSection>

            {/* Memory types */}
            {memoryTypeData.length > 0 && (
              <SettingsSection
                title="Memory types behind suggestions"
                description="Classifier labels of the memories retrieved for each suggestion, with the share accepted."
              >
                <SettingsCard>
                  <ChartContainer
                    config={memoryTypeChartConfig}
                    className="w-full aspect-auto"
                    style={{ height: Math.max(120, memoryTypeData.length * 36 + 40) }}
                  >
                    <BarChart
                      accessibilityLayer
                      data={memoryTypeData}
                      layout="vertical"
                      margin={{ left: 0, right: 48, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="type"
                        tickLine={false}
                        axisLine={false}
                        width={104}
                        tick={{ fontSize: 11 }}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, _name, item) => {
                              const row = item?.payload as (typeof memoryTypeData)[number]
                              return `${value} shown · ${row.accepted} accepted (${formatPercent(row.rate)})`
                            }}
                          />
                        }
                      />
                      <Bar
                        dataKey="shown"
                        fill="var(--color-shown)"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ChartContainer>
                  <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-500">
                    Bars show suggestions shown per memory type; hover for the accepted share.
                  </p>
                </SettingsCard>
              </SettingsSection>
            )}

            {/* Daily activity */}
            {showDaily && (
              <SettingsSection
                title="Activity over time"
                description="Suggestions shown per day, split by condition."
              >
                <SettingsCard>
                  <ChartContainer
                    config={dailyChartConfig}
                    className="h-[180px] w-full aspect-auto"
                  >
                    <BarChart
                      accessibilityLayer
                      data={stats!.daily}
                      margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
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
                        width={28}
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="kgGrounded"
                        stackId="day"
                        fill="var(--color-kgGrounded)"
                        stroke="var(--background)"
                        strokeWidth={2}
                        barSize={24}
                      />
                      <Bar
                        dataKey="memoryFree"
                        stackId="day"
                        fill="var(--color-memoryFree)"
                        stroke="var(--background)"
                        strokeWidth={2}
                        radius={[4, 4, 0, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ChartContainer>
                  <ChartLegend
                    items={[
                      {
                        label: 'KG-grounded',
                        light: '#2a78d6',
                        dark: '#3987e5',
                        value: stats!.kgGrounded.total,
                      },
                      {
                        label: 'Memory-free',
                        light: '#eb6834',
                        dark: '#d95926',
                        value: stats!.memoryFree.total,
                      },
                    ]}
                  />
                </SettingsCard>
              </SettingsSection>
            )}

            {/* Raw rows */}
            <SettingsSection
              title="Recent suggestions"
              description={`Most recent ${Math.min(entries.length, TABLE_ROW_LIMIT)} of ${stats!.total} logged rows for ${selectedLabel}.`}
            >
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10">
                      <TableRow>
                        <TableHead className="w-[130px]">Shown</TableHead>
                        {showUserColumn && <TableHead className="w-[120px]">Participant</TableHead>}
                        <TableHead className="w-[110px]">Condition</TableHead>
                        <TableHead className="min-w-[220px]">Suggestion</TableHead>
                        <TableHead className="w-[90px]">Memories</TableHead>
                        <TableHead className="w-[150px]">Outcome</TableHead>
                        <TableHead className="w-[80px] text-right">Time</TableHead>
                        <TableHead className="w-[70px] text-right">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((row: SuggestionLogRow) => {
                        const types = parseStringList(row.memory_types)
                        const memories = parseStringList(row.memories)
                        const isExpanded = expandedRows.has(row.id)
                        return (
                          <React.Fragment key={row.id}>
                            <TableRow>
                              <TableCell className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                {formatTimestamp(row.shown_at)}
                              </TableCell>
                              {showUserColumn && (
                                <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                                  {userLabels.get(row.user_id ?? UNATTRIBUTED_USER_ID) ??
                                    (row.user_id ? `${row.user_id.slice(0, 8)}…` : 'Not signed in')}
                                </TableCell>
                              )}
                              <TableCell className="text-xs">
                                {row.memory_baseline_mode === 1 ? (
                                  <span className="text-zinc-500 dark:text-zinc-400">
                                    Memory-free
                                  </span>
                                ) : (
                                  <span className="text-foreground">KG-grounded</span>
                                )}
                                {types.length > 0 && (
                                  <span className="block text-[10px] text-zinc-400 dark:text-zinc-600 truncate">
                                    {types.join(', ')}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                <span className="block text-foreground line-clamp-2">
                                  {row.suggestion}
                                </span>
                                <span className="block text-[10px] text-zinc-400 dark:text-zinc-600 line-clamp-1">
                                  {row.context}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                {memories.length === 0 ? (
                                  <span className="text-zinc-400 dark:text-zinc-600">—</span>
                                ) : (
                                  <button
                                    onClick={() => toggleRow(row.id)}
                                    className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
                                    aria-expanded={isExpanded}
                                  >
                                    <ChevronRight
                                      className={cn(
                                        'w-3 h-3 transition-transform',
                                        isExpanded && 'rotate-90'
                                      )}
                                    />
                                    {memories.length}
                                  </button>
                                )}
                              </TableCell>
                              <TableCell>
                                <OutcomeBadge outcome={row.outcome} />
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                                {formatMs(row.time_to_decision_ms)}
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                                {row.edit_distance === null ? '—' : row.edit_distance}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                                <TableCell colSpan={columnCount} className="py-3">
                                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                                    Memories sent to the model
                                  </p>
                                  <ul className="mt-2 space-y-1">
                                    {memories.map((memory, index) => (
                                      <li
                                        key={`${row.id}-memory-${index}`}
                                        className="flex gap-2 text-xs text-zinc-700 dark:text-zinc-300"
                                      >
                                        <span className="text-zinc-400 dark:text-zinc-600 tabular-nums flex-shrink-0">
                                          {index + 1}.
                                        </span>
                                        <span>{memory}</span>
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-500">
                                    <span className="font-medium">Full context:</span> {row.context}
                                  </p>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {logPath && (
                <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-600 break-all">
                  Mirrored to {logPath}
                </p>
              )}
            </SettingsSection>
          </>
        )}
      </div>
    </SettingsPage>
  )
}
