"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { History, Trash2 } from "lucide-react";
import { Conversation } from "@/lib/ai/types";

interface InterviewHistoryProps {
  sessions: Conversation[];
  onSelect: (conversationId: string) => void;
  onDelete: (e: React.MouseEvent, conversationId: string) => void;
  disabled?: boolean;
}

export function InterviewHistory({
  sessions,
  onSelect,
  onDelete,
  disabled,
}: InterviewHistoryProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={disabled}>
          <History className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
        {sessions.map((session) => (
          <DropdownMenuItem
            key={session.id}
            onClick={() => onSelect(session.id)}
            className="flex justify-between items-center group cursor-pointer"
          >
            <span className="truncate flex-1">{session.title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
              onClick={(e) => onDelete(e, session.id)}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </Button>
          </DropdownMenuItem>
        ))}
        {sessions.length === 0 && (
          <div className="p-2 text-sm text-muted-foreground">No history</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
