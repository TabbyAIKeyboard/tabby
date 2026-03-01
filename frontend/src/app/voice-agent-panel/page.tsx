"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import "./voice-agent.css";

type VoiceAgentState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

interface TranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export default function VoiceAgentPanelPage() {
  const [state, setState] = useState<VoiceAgentState>("idle");
  const [currentTranscript, setCurrentTranscript] = useState<TranscriptEntry | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const transcriptIdRef = useRef(0);
  const isEndingRef = useRef(false);

  const {
    isActive,
    isUserSpeaking,
    isAssistantSpeaking,
    isLoading,
    messages,
    start,
    stop,
  } = useVoiceChat();

  // Store stop function in ref to avoid stale closures
  const stopRef = useRef(stop);
  stopRef.current = stop;

  // End session handler
  const endSession = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    
    console.log("[VoiceAgentPanel] Ending session...");
    try {
      await stopRef.current();
      console.log("[VoiceAgentPanel] Voice chat stopped");
    } catch (err) {
      console.error("[VoiceAgentPanel] Error stopping:", err);
    }
    
    setState("idle");
    setCurrentTranscript(null);
    window.electron?.voiceAgentSessionStopped?.();
    
    setTimeout(() => {
      setIsVisible(false);
      window.electron?.voiceAgentHide?.();
      isEndingRef.current = false;
    }, 300);
  }, []);

  // Sync state based on voice chat status
  useEffect(() => {
    if (isLoading) {
      setState("connecting");
    } else if (isUserSpeaking) {
      setState("listening");
    } else if (isAssistantSpeaking) {
      setState("speaking");
    } else if (isActive) {
      setState("listening");
    } else {
      setState("idle");
      // Clear transcript when session ends
      if (!isActive && !isLoading) {
        setCurrentTranscript(null);
      }
    }

    // Notify main process of state change
    window.electron?.voiceAgentStateChange?.(
      isLoading ? "connecting" : 
      isUserSpeaking ? "listening" : 
      isAssistantSpeaking ? "speaking" : 
      isActive ? "listening" : "idle"
    );
  }, [isLoading, isUserSpeaking, isAssistantSpeaking, isActive]);

  // Update transcript from messages - only when active
  useEffect(() => {
    if (messages.length > 0 && isActive) {
      const lastMessage = messages[messages.length - 1];
      const textPart = lastMessage.parts.find(p => p.type === "text");
      if (textPart && "text" in textPart && textPart.text) {
        setCurrentTranscript({
          id: `${transcriptIdRef.current++}`,
          role: lastMessage.role as "user" | "assistant",
          text: textPart.text,
          timestamp: Date.now(),
        });
      }
    }
  }, [messages]);

  // Handle IPC events from Electron
  useEffect(() => {
    const electron = typeof window !== "undefined" ? window.electron : undefined;

    const handleStart = () => {
      console.log("[VoiceAgentPanel] Received start signal");
      isEndingRef.current = false;
      // Clear previous session data
      setCurrentTranscript(null);
      transcriptIdRef.current = 0;
      setState("connecting");
      setIsVisible(true);
      start();
      electron?.voiceAgentSessionStarted?.();
    };

    const handleStop = () => {
      console.log("[VoiceAgentPanel] Received stop signal");
      endSession();
    };

    const handleReset = () => {
      console.log("[VoiceAgentPanel] Received reset signal - clearing state");
      isEndingRef.current = false;
      stopRef.current();
      setState("idle");
      setCurrentTranscript(null);
      transcriptIdRef.current = 0;
      setIsVisible(false);
    };

    const handleState = (data: { state: string }) => {
      setState(data.state as VoiceAgentState);
    };

    const cleanupStart = electron?.onVoiceAgentStart?.(handleStart);
    const cleanupStop = electron?.onVoiceAgentStop?.(handleStop);
    const cleanupState = electron?.onVoiceAgentState?.(handleState);
    const cleanupReset = electron?.onVoiceAgentReset?.(handleReset);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isActive) {
        endSession();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cleanupStart?.();
      cleanupStop?.();
      cleanupState?.();
      cleanupReset?.();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [start, endSession, isActive]);

  const getStateLabel = () => {
    switch (state) {
      case "connecting": return "Connecting...";
      case "listening": return "Listening";
      case "thinking": return "Thinking";
      case "speaking": return "Speaking";
      default: return "Ready";
    }
  };

  return (
    <div className="voice-agent-container">
      <AnimatePresence>
        {(isVisible || state !== "idle") && (
          <motion.div
            className="voice-agent-panel"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3 
            }}
          >
            {/* Animated Orb */}
            <div className="orb-container">
              <motion.div
                className={`orb ${state}`}
                animate={{
                  scale: state === "listening" || state === "speaking" ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="orb-inner" />
                {(state === "listening" || state === "speaking") && (
                  <motion.div
                    className="orb-ring"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </motion.div>
              <motion.span
                className="state-label"
                key={state}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {getStateLabel()}
              </motion.span>
            </div>

            {/* Rolling Transcript */}
            <div className="transcript-container">
              <AnimatePresence mode="wait">
                {currentTranscript ? (
                  <motion.div
                    key={currentTranscript.id}
                    className={`transcript-text ${currentTranscript.role}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ 
                      type: "spring",
                      damping: 20,
                      stiffness: 200,
                    }}
                  >
                    <span className="role-indicator">
                      {currentTranscript.role === "user" ? "You" : "Tabby"}
                    </span>
                    <span className="text-content">{currentTranscript.text}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    className="transcript-placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                  >
                    {state === "connecting" ? "Initializing..." : "Speak to begin..."}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* End Session Button */}
            <motion.button
              type="button"
              className="end-session-btn"
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("[VoiceAgentPanel] End session button clicked");
                endSession();
              }}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              title="End session"
            >
              <X size={16} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
