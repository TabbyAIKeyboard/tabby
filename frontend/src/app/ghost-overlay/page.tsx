'use client';

import { useEffect, useState } from 'react';
import './ghost-overlay.css';

interface GhostState {
  suggestion: string;
  x: number;
  y: number;
  visible: boolean;
}

interface LoadingState {
  visible: boolean;
  x: number;
  y: number;
}

export default function GhostOverlayPage() {
  const [ghost, setGhost] = useState<GhostState>({
    suggestion: '',
    x: 0,
    y: 0,
    visible: false,
  });

  const [loading, setLoading] = useState<LoadingState>({
    visible: false,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const handleUpdate = (...args: unknown[]) => {
      const data = args[1] as GhostState;
      if (data) setGhost(data);
    };

    const handlePosition = (...args: unknown[]) => {
      const pos = args[1] as { x: number; y: number };
      if (pos) setGhost(prev => ({ ...prev, x: pos.x, y: pos.y }));
    };

    const handleLoading = (...args: unknown[]) => {
      const data = args[1] as LoadingState;
      if (data) setLoading(data);
    };

    const electron = typeof window !== 'undefined' ? window.electron : undefined;
    electron?.on?.('ghost-update', handleUpdate);
    electron?.on?.('ghost-position', handlePosition);
    electron?.on?.('ghost-loading', handleLoading);

    return () => {
      electron?.removeListener?.('ghost-update', handleUpdate);
      electron?.removeListener?.('ghost-position', handlePosition);
      electron?.removeListener?.('ghost-loading', handleLoading);
    };
  }, []);

  // Show loading indicator
  if (loading.visible) {
    return (
      <div className="ghost-overlay-container">
        <span
          className="ghost-loading"
          style={{
            left: loading.x,
            top: loading.y,
          }}
        >
          ⏳ Analyzing problem...
        </span>
      </div>
    );
  }

  // Show nothing if no suggestion
  if (!ghost.visible || !ghost.suggestion) {
    return null;
  }

  return (
    <div className="ghost-overlay-container">
      <div 
        className="ghost-content-wrapper"
        style={{
          left: ghost.x,
          top: ghost.y,
        }}
      >
        <span className="ghost-text">
          {ghost.suggestion}
        </span>
        
        <span className="ghost-hint">
          Shift+Tab ↵ accept · Shift+Esc dismiss
        </span>
      </div>
    </div>
  );
}
