"use client";

import * as React from "react";
import { Plus, Command, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Action } from "@/lib/ai/types";
import { loadActions, saveActions, resetToDefaults, isShortcutTaken } from "@/lib/ai/actions-store";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { Kbd } from "@/components/ui/kbd";

export function ActionsTab() {
  const [actions, setActions] = React.useState<Action[]>([]);
  const [selectedActionId, setSelectedActionId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const [label, setLabel] = React.useState("");
  const [icon, setIcon] = React.useState("⚡");
  const [prompt, setPrompt] = React.useState("");
  const [shortcut, setShortcut] = React.useState("");
  const [shortcutError, setShortcutError] = React.useState("");

  React.useEffect(() => {
    setActions(loadActions());
  }, []);

  const handleSaveActions = (newActions: Action[]) => {
    setActions(newActions);
    saveActions(newActions);
  };

  const handleSelectAction = (id: string) => {
    const action = actions.find((a) => a.id === id);
    if (action) {
      setSelectedActionId(id);
      setIsCreating(false);
      setLabel(action.label);
      setIcon(action.icon);
      setPrompt(action.prompt || "");
      setShortcut(action.shortcut || "");
      setShortcutError("");
    }
  };

  const handleCreateNew = () => {
    setSelectedActionId(null);
    setIsCreating(true);
    setLabel("");
    setIcon("⚡");
    setPrompt("");
    setShortcut("");
    setShortcutError("");
  };

  const validateShortcut = (value: string, currentId?: string): boolean => {
    if (!value) return true;
    
    if (value.length !== 1 || !/^[a-zA-Z0-9]$/.test(value)) {
      setShortcutError("Shortcut must be a single letter or number");
      return false;
    }
    
    if (isShortcutTaken(actions, value, currentId)) {
      setShortcutError("This shortcut is already in use");
      return false;
    }
    
    setShortcutError("");
    return true;
  };

  const handleShortcutChange = (value: string) => {
    const upper = value.toUpperCase().slice(-1);
    setShortcut(upper);
    validateShortcut(upper, selectedActionId ?? undefined);
  };

  const handleSave = () => {
    if (!label.trim()) return;
    
    if (shortcut && !validateShortcut(shortcut, selectedActionId ?? undefined)) {
      return;
    }

    if (isCreating) {
      if (!prompt.trim()) return;
      
      const newAction: Action = {
        id: nanoid(),
        label,
        icon,
        prompt,
        shortcut: shortcut || undefined,
        isDefault: false,
      };
      handleSaveActions([...actions, newAction]);
      setSelectedActionId(newAction.id);
      setIsCreating(false);
    } else if (selectedActionId) {
      const updatedActions = actions.map((a) =>
        a.id === selectedActionId 
          ? { ...a, label, icon, prompt: prompt || a.prompt, shortcut: shortcut || undefined } 
          : a
      );
      handleSaveActions(updatedActions);
    }
  };

  const handleDelete = () => {
    if (selectedActionId) {
      const action = actions.find(a => a.id === selectedActionId);
      if (action?.isDefault) return;
      
      const newActions = actions.filter((a) => a.id !== selectedActionId);
      handleSaveActions(newActions);
      setSelectedActionId(null);
      setLabel("");
      setIcon("⚡");
      setPrompt("");
      setShortcut("");
    }
  };

  const handleReset = () => {
    const defaults = resetToDefaults();
    setActions(defaults);
    setSelectedActionId(null);
    setLabel("");
    setIcon("⚡");
    setPrompt("");
    setShortcut("");
  };

  const selectedAction = selectedActionId 
    ? actions.find(a => a.id === selectedActionId) 
    : null;
  const isDefaultAction = selectedAction?.isDefault ?? false;
  const isSpecialAction = selectedActionId === "chat" || selectedActionId === "custom";

  return (
    <div className="flex h-full">
      <div className="w-64 border-r bg-zinc-50 dark:bg-zinc-900/50 flex flex-col">
        <ScrollArea className="flex-1 h-[calc(100%-8rem)]">
          <div className="p-3 space-y-1">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleSelectAction(action.id as string)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                  selectedActionId === action.id
                    ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground font-medium"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base shrink-0">{action.icon}</span>
                  <span className="truncate">{action.label}</span>
                </div>
                {action.shortcut && (
                  <Kbd className="text-xs px-1.5 shrink-0">{action.shortcut}</Kbd>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-t bg-white/50 dark:bg-zinc-900/50 space-y-2">
          <Button
            onClick={handleCreateNew}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Action
          </Button>
          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 flex flex-col overflow-auto">
        {selectedActionId || isCreating ? (
          <div className="max-w-md w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                {isCreating ? "Create New Action" : "Edit Action"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDefaultAction 
                  ? "Configure the shortcut and prompt for this default action."
                  : "Configure how this action transforms your text."}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="label">Action Name</Label>
                  <Input
                    id="label"
                    placeholder="e.g., Fix Grammar"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    disabled={isSpecialAction}
                  />
                </div>
                <div className="space-y-2 w-20">
                  <Label htmlFor="icon">Icon</Label>
                  <Input
                    id="icon"
                    placeholder="⚡"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="text-center text-lg"
                    disabled={isSpecialAction}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shortcut">Keyboard Shortcut</Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted rounded-md text-sm text-muted-foreground">
                    <span>Alt</span>
                    <span>+</span>
                  </div>
                  <Input
                    id="shortcut"
                    placeholder="F"
                    value={shortcut}
                    onChange={(e) => handleShortcutChange(e.target.value)}
                    className="w-16 text-center uppercase"
                    maxLength={1}
                  />
                </div>
                {shortcutError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {shortcutError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Press Alt + this key to quickly trigger this action
                </p>
              </div>

              {!isSpecialAction && (
                <div className="space-y-2">
                  <Label htmlFor="prompt">System Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Instructions for the AI..."
                    className="min-h-[140px] resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button onClick={handleSave} className="flex-1">
                {isCreating ? "Create Action" : "Save Changes"}
              </Button>
              {!isCreating && !isDefaultAction && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-2">
              <Command className="w-8 h-8 opacity-50" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">No Action Selected</h3>
              <p className="text-sm max-w-xs mx-auto mt-1">
                Start by creating a new action or select an existing one from the list.
              </p>
            </div>
            <Button onClick={handleCreateNew} className="mt-4">
              New Action
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
