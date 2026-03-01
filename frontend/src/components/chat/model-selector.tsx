"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { models, type Model } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { Key, Info } from "lucide-react";

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (id: string) => void;
  className?: string;
}

export const ModelSelector = React.memo(function ModelSelector({
  selectedModelId,
  onModelChange,
  className,
}: ModelSelectorProps) {
  const groupedModels = React.useMemo(() => {
    return models.reduce((acc, model) => {
      const provider = model.provider || "Custom"; // Fallback if provider is missing
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, Model[]>);
  }, []);

  return (
    <Select value={selectedModelId} onValueChange={onModelChange}>
      <SelectTrigger
        className={cn(
          "w-fit border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground focus:ring-0 focus:ring-offset-0",
          className
        )}
      >
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedModels).map(([provider, providerModels]) => (
          <SelectGroup key={provider}>
            <SelectLabel>{provider}</SelectLabel>
            {providerModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center gap-2">
                  {model.label}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
});
