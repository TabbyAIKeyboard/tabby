"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SettingsPageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** If true, the content takes full width without max-width constraint */
  fullWidth?: boolean;
  /** If true, disables the scroll area (for tabs with their own scrolling) */
  noScroll?: boolean;
  /** Custom className for the content wrapper */
  className?: string;
}

/**
 * Wrapper component for settings tab content.
 * Provides consistent header, padding, and centering across all tabs.
 */
export function SettingsPage({
  title,
  description,
  children,
  fullWidth = false,
  noScroll = false,
  className,
}: SettingsPageProps) {
  const content = (
    <div className="p-6 h-full w-full">
      {/* Centered container */}
      <div className={cn("mx-auto", !fullWidth && "max-w-2xl")}>
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {description}
            </p>
          )}
        </div>

        <Separator className="mb-6" />

        {/* Content */}
        <div className={className}>{children}</div>
      </div>
    </div>
  );

  if (noScroll) {
    return content;
  }

  return <ScrollArea className="h-full w-full">{content}</ScrollArea>;
}

/**
 * Section within a settings page with a header and optional description
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="pb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * A single setting row with icon, label, description and control
 */
export function SettingRow({
  icon,
  iconColor = "text-zinc-500",
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  iconColor?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex gap-3 min-w-0 flex-1">
        {icon && <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/**
 * Status badge for showing enabled/disabled/warning states
 */
export function StatusBadge({
  status,
  label,
}: {
  status: "success" | "warning" | "error";
  label: string;
}) {
  const colors = {
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    error: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        colors[status]
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[status])} />
      {label}
    </span>
  );
}

/**
 * Card component for grouping related settings
 */
export function SettingsCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30",
        className
      )}
    >
      {children}
    </div>
  );
}
