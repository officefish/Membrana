import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface DeviceBoardModeContextValue {
  readonly isBoardMode: boolean;
  readonly enterBoardMode: () => void;
  readonly exitBoardMode: () => void;
}

const DeviceBoardModeContext = createContext<DeviceBoardModeContextValue | null>(null);

export interface DeviceBoardModeProviderProps {
  readonly children: React.ReactNode;
}

/** Провайдер режима полноэкранной доски (board mode). */
export const DeviceBoardModeProvider: React.FC<DeviceBoardModeProviderProps> = ({ children }) => {
  const [isBoardMode, setIsBoardMode] = useState(false);

  const enterBoardMode = useCallback(() => {
    setIsBoardMode(true);
  }, []);

  const exitBoardMode = useCallback(() => {
    setIsBoardMode(false);
  }, []);

  const value = useMemo<DeviceBoardModeContextValue>(
    () => ({ isBoardMode, enterBoardMode, exitBoardMode }),
    [isBoardMode, enterBoardMode, exitBoardMode],
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
