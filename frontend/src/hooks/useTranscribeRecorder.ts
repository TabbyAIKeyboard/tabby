'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export type TranscribeStatus = 'idle' | 'recording' | 'processing';

export function useTranscribeRecorder() {
  const [status, setStatus] = useState<TranscribeStatus>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      console.log('[useTranscribeRecorder] Starting recording...');
      setStatus('recording');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      console.log('[useTranscribeRecorder] Recording started');
    } catch (error) {
      console.error('[useTranscribeRecorder] Failed to start recording:', error);
      setStatus('idle');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    console.log('[useTranscribeRecorder] Stopping recording...');
    setStatus('processing');

    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        console.log('[useTranscribeRecorder] No active recording');
        setStatus('idle');
        resolve();
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        // Stop stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Convert to base64
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('[useTranscribeRecorder] Audio blob size:', audioBlob.size);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          console.log('[useTranscribeRecorder] Sending audio, length:', base64Audio.length);
          
          // Send to main process
          window.electron?.sendTranscribeAudio?.(base64Audio);
          
          // Reset status after a short delay (transcription happens in background)
          setTimeout(() => setStatus('idle'), 3000);
          resolve();
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    });
  }, []);

  // Listen for transcribe start/stop events
  useEffect(() => {
    const electron = typeof window !== 'undefined' ? window.electron : undefined;

    const handleStart = () => {
      console.log('[useTranscribeRecorder] Received start signal');
      startRecording();
    };

    const handleStop = () => {
      console.log('[useTranscribeRecorder] Received stop signal');
      stopRecording();
    };

    const cleanupStart = electron?.onTranscribeStart?.(handleStart);
    const cleanupStop = electron?.onTranscribeStop?.(handleStop);

    return () => {
      cleanupStart?.();
      cleanupStop?.();
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startRecording, stopRecording]);

  return { status, startRecording, stopRecording };
}
