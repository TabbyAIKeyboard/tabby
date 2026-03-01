"use client";

import Image from "next/image";
import { SettingsPage } from "./settings-page";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Tabby";
const appIcon = process.env.NEXT_PUBLIC_APP_ICON || "/logos/tabby-logo.png";

export function AboutTab() {
  return (
    <SettingsPage title="About" description="Version & links">
      <div className="flex flex-col items-center text-center space-y-8 py-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
            <Image
              src={appIcon}
              alt={appName}
              width={96}
              height={96}
              className="w-full h-full object-contain p-2 rounded-2xl"
            />
          </div>
        </div>

        {/* App Info */}
        <div className="space-y-3">
          <h1 className="text-3xl font-serif font-normal text-foreground tracking-tight">
            {appName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Version 2.0.0
          </p>
        </div>

        {/* Description */}
        <p className="text-muted-foreground leading-relaxed font-light max-w-md">
          Your intelligent writing assistant. Enhance your workflow with AI-powered text transformations, coding interview assistance, and persistent memory.
        </p>

        {/* Footer */}
        <div className="pt-8 space-y-2">
          <p className="text-xs text-muted-foreground">
            Built with care for developers and writers
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            © 2026 {appName}. All rights reserved.
          </p>
        </div>
      </div>
    </SettingsPage>
  );
}

