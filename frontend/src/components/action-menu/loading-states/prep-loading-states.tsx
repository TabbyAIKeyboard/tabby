"use client";

import { Loader2, Shapes, Lightbulb, GitBranch, AlertTriangle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  className?: string;
}

function LoadingBase({ icon: Icon, text, className }: { icon: React.ElementType; text: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 p-6", className)}>
      <div className="relative">
        <Icon className="h-8 w-8 text-primary/50" />
        <Loader2 className="absolute -right-1 -top-1 h-4 w-4 animate-spin text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function PatternLoading({ className }: LoadingStateProps) {
  return <LoadingBase icon={Shapes} text="Identifying pattern..." className={className} />;
}

export function HintsLoading({ className }: LoadingStateProps) {
  return <LoadingBase icon={Lightbulb} text="Generating hints..." className={className} />;
}

export function SimilarLoading({ className }: LoadingStateProps) {
  return <LoadingBase icon={GitBranch} text="Finding similar problems..." className={className} />;
}

export function MistakesLoading({ className }: LoadingStateProps) {
  return <LoadingBase icon={AlertTriangle} text="Checking your history..." className={className} />;
}

export function PrepMemoriesLoading({ className }: LoadingStateProps) {
  return <LoadingBase icon={Brain} text="Loading memories..." className={className} />;
}

export function AnalyzingPrepLoading({ className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 p-6", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Analyzing problem...</p>
    </div>
  );
}
