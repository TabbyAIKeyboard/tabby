let screenModule: Electron.Screen | null = null;

function getScreen(): Electron.Screen {
  if (!screenModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    screenModule = require('electron').screen;
  }
  return screenModule as Electron.Screen;
}

export interface CaretPosition {
  x: number;
  y: number;
  isValid: boolean;
}

export async function getCaretPosition(): Promise<CaretPosition> {
  try {
    const cursorPoint = getScreen().getCursorScreenPoint();
    
    return {
      x: cursorPoint.x + 5,
      y: cursorPoint.y + 20,
      isValid: true,
    };
  } catch (error) {
    console.error('[CaretTracker] Error:', error);
    return { x: 100, y: 100, isValid: true };
  }
}

export function startCaretTracking(
  onPositionChange: (pos: CaretPosition) => void,
  intervalMs = 100
): () => void {
  let isRunning = true;
  let lastX = 0;
  let lastY = 0;
  
  const poll = async () => {
    if (!isRunning) return;
    
    const pos = await getCaretPosition();
    
    if (pos.isValid && (pos.x !== lastX || pos.y !== lastY)) {
      lastX = pos.x;
      lastY = pos.y;
      onPositionChange(pos);
    }
    
    if (isRunning) {
      setTimeout(poll, intervalMs);
    }
  };
  
  poll();
  
  return () => {
    isRunning = false;
  };
}
