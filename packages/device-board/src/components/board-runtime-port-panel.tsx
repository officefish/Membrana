import React from 'react';

import { socketTypeIndicatorClass } from '../graph/socket-type-indicator.js';
import type { RuntimePortInspection } from '../runtime/inspect-node-ports.js';

const ExecPortContent: React.FC<{ readonly compact?: boolean }> = ({ compact = false }) => (
  <div className={compact ? 'flex flex-col' : 'flex flex-col gap-0.5'}>
    <span className="text-[10px] font-semibold uppercase tracking-wide text-base-content/70">EXEC</span>
    <span className={compact ? 'text-[10px] text-base-content/55' : 'text-xs text-base-content/60'}>
      поток исполнения
    </span>
  </div>
);

const PortValueRow: React.FC<{
  readonly port: RuntimePortInspection;
}> = ({ port }) => (
  <div className="flex min-w-0 flex-col gap-0.5 rounded-md border border-base-300/80 bg-base-100/60 px-2 py-1.5">
    {port.kind === 'exec' ? (
      <ExecPortContent />
    ) : (
      <>
        <span className="truncate text-[10px] font-medium uppercase tracking-wide text-base-content/50">
          {port.label}
        </span>
        {port.error !== undefined ? (
          <span className="break-all font-mono text-xs text-error">{port.error}</span>
        ) : (
          <span className="break-all font-mono text-xs text-base-content">{port.valueText ?? '—'}</span>
        )}
      </>
    )}
  </div>
);

const PortInterfaceRow: React.FC<{
  readonly port: RuntimePortInspection;
  readonly showTypeIndicator: boolean;
}> = ({ port, showTypeIndicator }) => {
  if (port.kind === 'exec') {
    return <ExecPortContent compact />;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {showTypeIndicator ? (
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${socketTypeIndicatorClass(port.kind, port.socketType, port.nullable)}`}
          aria-hidden
        />
      ) : null}
      <span className="truncate font-mono text-[10px] text-base-content/55">{port.label}</span>
    </div>
  );
};

export interface BoardRuntimePortPanelProps {
  readonly title: string;
  readonly ports: readonly RuntimePortInspection[];
  readonly mode: 'values' | 'interface';
  readonly showTypeIndicators?: boolean;
  readonly emptyHint?: string;
}

/** Панель runtime: значения портов или схема интерфейса (мелкий текст). */
export const BoardRuntimePortPanel: React.FC<BoardRuntimePortPanelProps> = ({
  title,
  ports,
  mode,
  showTypeIndicators = false,
  emptyHint = 'Нет портов',
}) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">{title}</p>
    {ports.length === 0 ? (
      <p className="text-[10px] text-base-content/40">{emptyHint}</p>
    ) : mode === 'values' ? (
      <div className="flex flex-col gap-1">
        {ports.map((port) => (
          <PortValueRow key={port.handle} port={port} />
        ))}
      </div>
    ) : (
      <div className="flex flex-col gap-0.5">
        {ports.map((port) => (
          <PortInterfaceRow
            key={port.handle}
            port={port}
            showTypeIndicator={showTypeIndicators}
          />
        ))}
      </div>
    )}
  </section>
);
