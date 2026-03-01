"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { getApiUrl, getAuthHeaders } from "@/lib/api-url";

const MAX_RECORDING_DURATION_MS = 2 * 60 * 1000;

interface UseAudioRecorderOptions {
  onTranscription: (text: string) => void;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useAudioRecorder({
  onTranscription,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (chunksRef.current.length === 0) {
          toast.error("No audio recorded");
          return;
        }

        setIsTranscribing(true);

        try {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);

          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const base64Data = base64Audio.split(",")[1];

            const response = await fetch(getApiUrl("/api/transcribe"), {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                ...(await getAuthHeaders()),
              },
              credentials: "include",
              body: JSON.stringify({ audio: base64Data }),
            });

            const result = await response.json();

            if (result.text) {
              onTranscription(result.text);
            } else {
              toast.error(result.error || "Failed to transcribe audio");
            }

            setIsTranscribing(false);
          };

          reader.onerror = () => {
            toast.error("Failed to process audio");
            setIsTranscribing(false);
          };
        } catch (error) {
          console.error("Transcription error:", error);
          toast.error("Failed to transcribe audio");
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      timeoutRef.current = setTimeout(() => {
        toast.info("Recording limit reached (2 minutes)");
        stopRecording();
      }, MAX_RECORDING_DURATION_MS);
    } catch (error) {
      console.error("Error starting recording:", error);
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone access.");
      } else {
        toast.error("Failed to start recording");
      }
    }
  }, [onTranscription, stopRecording]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
