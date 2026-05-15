import React, { useMemo } from 'react';
import { getRuntimeStorageMode, type RuntimeStorageMode } from '../lib/runtimeStorageMode';

const MODES: { id: RuntimeStorageMode; label: string; hint: string }[] = [
  {
    id: 'web-localstorage',
    label: 'Web local storage',
    hint: 'Файлы в локальном dev-хранилище',
  },
  {
    id: 'electron-system-files',
    label: 'Electron FS',
    hint: 'Файлы в файловой системе',
  },
];

export interface StorageRuntimeIndicatorProps {
  /** Компактный badge для футера */
  compact?: boolean;
}

export const StorageRuntimeIndicator: React.FC<StorageRuntimeIndicatorProps> = ({
  compact = false,
}) => {
  const active = useMemo(() => getRuntimeStorageMode(), []);
  const mode = MODES.find((m) => m.id === active)!;

  if (compact) {
    const short = active === 'web-localstorage' ? 'Web' : 'Electron';
    return (
      <span
        className="shrink-0 text-[9px] tabular-nums text-base-content/35"
        title={`${mode.label} — ${mode.hint}`}
        aria-label={`Режим хранения: ${mode.label}`}
      >
        {short}
      </span>
    );
  }

  return (
    <div
      className="flex flex-col gap-0.5"
      role="status"
      aria-label={`Режим хранения: ${active === 'web-localstorage' ? 'Web local storage' : 'Electron FS'}`}
    >
      <span className="text-[10px] uppercase tracking-wide text-base-content/45">данные</span>
      <div className="flex rounded-md border border-base-300 bg-base-200/60 p-0.5">
        {MODES.map((m) => {
          const on = m.id === active;
          return (
            <span
              key={m.id}
              className={`flex-1 min-w-0 px-2 py-0.5 text-center text-[10px] leading-tight rounded transition-colors ${
                on
                  ? 'bg-primary text-primary-content font-medium shadow-sm'
                  : 'text-base-content/45 font-normal'
              }`}
            >
              <span className="block truncate">{m.label}</span>
              <span className={`block text-[9px] leading-snug ${on ? 'text-primary-content/80' : 'text-base-content/35'}`}>
                {m.hint}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
