"use client";

import { useEffect, useState } from "react";
import { Pen, Zap, Sparkles } from "lucide-react";
import "./indicator.css";

type TranscribeState = "idle" | "recording" | "processing";
type VoiceMode = "transcribe" | "command" | "generate";

const MODE_CONFIG: Record<VoiceMode, { icon: React.ReactNode; label: string }> = {
  transcribe: { icon: <Pen size={14} strokeWidth={2.5} />, label: "Transcribe" },
  command: { icon: <Zap size={14} strokeWidth={2.5} />, label: "Command" },
  generate: { icon: <Sparkles size={14} strokeWidth={2.5} />, label: "Generate" },
};

export default function TranscribeIndicatorPage() {
  const [state, setState] = useState<TranscribeState>("recording");
  const [mode, setMode] = useState<VoiceMode>("transcribe");

  useEffect(() => {
    const electron = typeof window !== "undefined" ? window.electron : undefined;

    const handleState = (...args: unknown[]) => {
      const data = args[1] as { state?: string; mode?: string } | undefined;
      if (data?.state) setState(data.state as TranscribeState);
      if (data?.mode) setMode(data.mode as VoiceMode);
    };

    const handleModeChange = (...args: unknown[]) => {
      const data = args[1] as { mode: string } | undefined;
      if (data?.mode) setMode(data.mode as VoiceMode);
    };

    electron?.on?.("transcribe-indicator-state", handleState);
    electron?.on?.("voice-mode-change", handleModeChange);

    return () => {
      electron?.removeListener?.("transcribe-indicator-state", handleState);
      electron?.removeListener?.("voice-mode-change", handleModeChange);
    };
  }, []);

  const config = MODE_CONFIG[mode];

  return (
    <div className="indicator-container">
      <div className={`indicator-pill ${mode}`}>
        <span className={`mode-icon ${mode}`}>{config.icon}</span>
        <span className={`mode-label ${mode}`}>{config.label}</span>
        {state !== "idle" && (
          <>
            <span className="separator" />
            {state === "recording" && (
              <>
                <span className="recording-dot" />
                <span className="status-text">Recording</span>
              </>
            )}
            {state === "processing" && (
              <>
                <span className="processing-spinner" />
                <span className="status-text">Processing</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
