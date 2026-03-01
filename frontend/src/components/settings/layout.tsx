"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GeneralTab } from "./general-tab";
import { ActionsTab } from "./actions-tab";
import { AboutTab } from "./about-tab";
import { MemoryTab } from "./memory-tab";
import { GraphTab } from "./graph-tab";
import { AccountTab } from "./account-tab";
import { ShortcutsTab } from "./shortcuts-tab";
import {
  Settings,
  Keyboard,
  Zap,
  Database,
  GitBranch,
  User,
  Info,
  LogOut,
} from "lucide-react";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Tabby";

interface NavItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: "general",
    label: "General",
    description: "App preferences",
    icon: <Settings className="w-4 h-4" />,
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    description: "Keyboard shortcuts",
    icon: <Keyboard className="w-4 h-4" />,
  },
  {
    id: "actions",
    label: "Actions",
    description: "AI actions",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: "memory",
    label: "Memory",
    description: "Memory storage",
    icon: <Database className="w-4 h-4" />,
  },
  {
    id: "graph",
    label: "Graph",
    description: "Knowledge graph",
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    id: "account",
    label: "Account",
    description: "User profile",
    icon: <User className="w-4 h-4" />,
  },
  {
    id: "about",
    label: "About",
    description: "Version & links",
    icon: <Info className="w-4 h-4" />,
  },
];

function SidebarNavItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
        "hover:bg-zinc-100 dark:hover:bg-zinc-800/60",
        isActive && "bg-zinc-100 dark:bg-zinc-800/80"
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 text-zinc-500 dark:text-zinc-400",
          isActive && "text-foreground"
        )}
      >
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isActive ? "text-foreground" : "text-zinc-700 dark:text-zinc-300"
          )}
        >
          {item.label}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">
          {item.description}
        </p>
      </div>
    </button>
  );
}

export function SettingsLayout() {
  const [activeTab, setActiveTab] = React.useState("general");

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralTab />;
      case "shortcuts":
        return <ShortcutsTab />;
      case "actions":
        return <ActionsTab />;
      case "memory":
        return <MemoryTab />;
      case "graph":
        return <GraphTab />;
      case "account":
        return <AccountTab />;
      case "about":
        return <AboutTab />;
      default:
        return <GeneralTab />;
    }
  };

  return (
    <div className="h-screen bg-white dark:bg-zinc-950 text-foreground flex overflow-hidden selection:bg-zinc-200 dark:selection:bg-zinc-800">
      {/* Sidebar */}
      <aside className="w-[15vw] min-w-[180px] max-w-[260px] h-full flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-semibold text-foreground">
              Settings
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 px-2 py-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => window.close()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Quit {appName}</span>
          </button>
          <p className="px-3 pt-2 text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
            Version 2.0.0
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden bg-white dark:bg-zinc-950">
        {renderContent()}
      </main>
    </div>
  );
}
