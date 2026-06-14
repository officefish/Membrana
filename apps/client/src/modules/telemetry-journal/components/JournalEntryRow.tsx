import React, { useState } from 'react';
import type { TelemetryEntry } from '@membrana/telemetry-service';

export interface JournalEntryRowProps {
  entry: TelemetryEntry;
}

export const JournalEntryRow: React.FC<JournalEntryRowProps> = ({ entry }) => {
  const [open, setOpen] = useState(false);
  const preview = JSON.stringify(entry.data);
  const short =
    preview.length > 160 ? `${preview.slice(0, 160)}…` : preview;

  return (
    <div className="rounded-box border border-base-300 bg-base-200/40 text-sm">
      <button
        type="button"
        className="w-full text-left p-3 flex flex-wrap items-center gap-2 hover:bg-base-300/30 rounded-box"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="badge badge-sm badge-outline font-mono">{entry.type}</span>
        <span className="font-medium text-base-content">{entry.moduleName}</span>
        <span className="text-xs text-base-content/50 font-mono truncate max-w-[10rem]">
          {entry.moduleId}
        </span>
        <span className="text-xs text-base-content/50 tabular-nums ml-auto">
          {new Date(entry.timestamp).toLocaleString()}
        </span>
      </button>
      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {entry.tags.map((t) => (
          <span key={t} className="badge badge-ghost badge-xs">
            {t}
          </span>
        ))}
      </div>
      {open ? (
        <pre className="mx-3 mb-3 p-2 rounded bg-base-300/50 text-xs overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(entry.data, null, 2)}
        </pre>
      ) : (
        <p className="px-3 pb-3 text-xs text-base-content/60 font-mono break-all">{short}</p>
      )}
    </div>
  );
};
