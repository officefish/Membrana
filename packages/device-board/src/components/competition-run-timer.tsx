import React, { useEffect, useState } from 'react';

export interface CompetitionRunTimerProps {
  readonly isRunning: boolean;
  readonly runStartedAtMs: number | null;
  readonly timeoutSec: number;
}

function formatMmSs(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Footer countdown for competition execution policy (Phase 3). */
export const CompetitionRunTimer: React.FC<CompetitionRunTimerProps> = ({
  isRunning,
  runStartedAtMs,
  timeoutSec,
}) => {
  const [remainingSec, setRemainingSec] = useState(timeoutSec);

  useEffect(() => {
    if (!isRunning || runStartedAtMs === null) {
      setRemainingSec(timeoutSec);
      return;
    }

    const tick = (): void => {
      const elapsedSec = Math.floor((Date.now() - runStartedAtMs) / 1000);
      setRemainingSec(Math.max(0, timeoutSec - elapsedSec));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isRunning, runStartedAtMs, timeoutSec]);

  if (!isRunning || runStartedAtMs === null) {
    return null;
  }

  const urgent = remainingSec <= 60;

  return (
    <div
      className="flex items-center gap-2 border-t border-base-200 bg-base-200/40 px-4 py-2 text-sm"
      data-testid="competition-run-timer"
      role="status"
    >
      <span className={`badge badge-sm ${urgent ? 'badge-warning' : 'badge-ghost'}`}>Конкурс</span>
      <span className={urgent ? 'font-semibold text-warning' : 'text-base-content/80'}>
        Осталось {formatMmSs(remainingSec)} / {formatMmSs(timeoutSec)}
      </span>
      <span className="text-xs text-base-content/60">
        Изменения параметров учитываются; структура сценария заблокирована
      </span>
    </div>
  );
};
