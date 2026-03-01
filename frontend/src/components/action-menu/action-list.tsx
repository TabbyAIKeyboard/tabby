"use client";

import { cn } from "@/lib/utils";
import { Action } from "@/lib/ai/types";
import { memo, useRef, useEffect, useMemo } from "react";

interface ActionListProps {
  actions: Action[];
  selectedIndex: number;
  onSelect: (action: Action) => void;
  filter: string;
}

export const ActionList = memo(function ActionList({
  actions,
  selectedIndex,
  onSelect,
  filter,
}: ActionListProps) {
  const filteredActions = actions.filter((action) =>
    action.label.toLowerCase().includes(filter.toLowerCase())
  );

  const { agents, actionsGroup } = useMemo(() => {
    const agents = filteredActions.filter((a) => a.group === "agent");
    const actionsGroup = filteredActions.filter((a) => a.group !== "agent");
    return { agents, actionsGroup };
  }, [filteredActions]);

  if (filteredActions.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground/60">
        No actions found
      </div>
    );
  }

  const agentCount = agents.length;

  return (
    <div className="flex flex-col">
      {agents.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
              AI Agents
            </span>
          </div>
          <div className="flex flex-col px-2">
            {agents.map((action, index) => (
              <ActionItem
                key={action.id}
                action={action}
                isSelected={index === selectedIndex}
                onClick={() => onSelect(action)}
              />
            ))}
          </div>
        </>
      )}

      {actionsGroup.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">
              AI Actions
            </span>
          </div>
          <div className="flex flex-col px-2">
            {actionsGroup.map((action, index) => (
              <ActionItem
                key={action.id}
                action={action}
                isSelected={index + agentCount === selectedIndex}
                onClick={() => onSelect(action)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

interface ActionItemProps {
  action: Action;
  isSelected: boolean;
  onClick: () => void;
}

function ActionItem({ action, isSelected, onClick }: ActionItemProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      tabIndex={-1}
      className={cn(
        "flex items-center justify-between gap-3 px-3.5 py-2.5 text-left rounded-lg",
        "transition-all duration-200 ease-out",
        "hover:bg-white/[0.06] dark:hover:bg-white/[0.06]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20",
        isSelected && "bg-white/[0.08] dark:bg-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-base w-5 h-5 flex items-center justify-center shrink-0">{action.icon}</span>
        <span className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground transition-colors duration-200">{action.label}</span>
      </div>
      {action.shortcut && (
        <div className="flex items-center gap-1 text-muted-foreground/40">
          <span className="text-[10px] font-medium tracking-wide uppercase">Alt</span>
          <span className="text-[11px] font-semibold">{action.shortcut}</span>
        </div>
      )}
    </button>
  );
}
