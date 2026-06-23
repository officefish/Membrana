import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { DeviceBoardSession } from '../types/device-board-session.js';

export type { DeviceBoardSession } from '../types/device-board-session.js';
export { isDeviceBoardSessionReadOnly } from '../types/device-board-session.js';

export interface DeviceBoardModeContextValue {
  readonly isBoardMode: boolean;
  readonly session: DeviceBoardSession | null;
  readonly enterBoardMode: (session: DeviceBoardSession) => void;
  readonly exitBoardMode: () => void;
}

const DeviceBoardModeContext = createContext<DeviceBoardModeContextValue | null>(null);

export interface DeviceBoardModeProviderProps {
  readonly children: React.ReactNode;
}

/** Провайдер режима полноэкранной доски (board mode). */
export const DeviceBoardModeProvider: React.FC<DeviceBoardModeProviderProps> = ({ children }) => {
  const [isBoardMode, setIsBoardMode] = useState(false);
  const [session, setSession] = useState<DeviceBoardSession | null>(null);

  const enterBoardMode = useCallback((nextSession: DeviceBoardSession) => {
    setSession(nextSession);
    setIsBoardMode(true);
  }, []);

  const exitBoardMode = useCallback(() => {
    setIsBoardMode(false);
    setSession(null);
  }, []);

  const value = useMemo<DeviceBoardModeContextValue>(
    () => ({ isBoardMode, session, enterBoardMode, exitBoardMode }),
    [isBoardMode, session, enterBoardMode, exitBoardMode],
  );

  return (
    <DeviceBoardModeContext.Provider value={value}>{children}</DeviceBoardModeContext.Provider>
  );
};

/** Хук входа/выхода из board mode. */
export function useDeviceBoardMode(): DeviceBoardModeContextValue {
  const context = useContext(DeviceBoardModeContext);
  if (context === null) {
    throw new Error('useDeviceBoardMode must be used within DeviceBoardModeProvider');
  }
  return context;
}
