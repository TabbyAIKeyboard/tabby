"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { getApiUrl, getAuthHeaders } from "@/lib/api-url";

interface UseSpeechPlaybackReturn {
  isPlaying: boolean;
  playText: (text: string) => Promise<void>;
  stopPlayback: () => void;
}

export function useSpeechPlayback(): UseSpeechPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playText = useCallback(async (text: string) => {
    try {
      stopPlayback();

      const response = await fetch(getApiUrl("/api/speech"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        credentials: "include",
        body: JSON.stringify({ text, voice: "alloy" }),
      });

      const result = await response.json();

      if (!result.audio) {
        toast.error(result.error || "Failed to generate speech");
        return;
      }

      const audio = new Audio(result.audio);
      audioRef.current = audio;
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        toast.error("Failed to play audio");
        setIsPlaying(false);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("Speech playback error:", error);
      toast.error("Failed to play speech");
      setIsPlaying(false);
    }
  }, [stopPlayback]);

  return {
    isPlaying,
    playText,
    stopPlayback,
  };
}
