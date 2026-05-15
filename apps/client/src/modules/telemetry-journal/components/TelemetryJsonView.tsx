import React from 'react';
import JsonView from '@uiw/react-json-view';

export interface TelemetryJsonViewProps {
  readonly value: Record<string, unknown>;
}

/** Интерактивный просмотр JSON payload записи телеметрии. */
export const TelemetryJsonView: React.FC<TelemetryJsonViewProps> = ({ value }) => (
  <div
    className="rounded-box border border-base-300 bg-base-200/40 p-2 font-mono text-xs max-h-[min(24rem,40vh)] overflow-auto"
    data-testid="telemetry-json-view"
  >
    <JsonView
      value={value}
      collapsed={2}
      displayDataTypes={false}
      enableClipboard={false}
      style={
        {
          '--w-rjv-font-family': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          '--w-rjv-background-color': 'transparent',
          '--w-rjv-curlybraces-color': 'hsl(var(--bc) / 0.6)',
          '--w-rjv-colon-color': 'hsl(var(--bc) / 0.5)',
          '--w-rjv-brackets-color': 'hsl(var(--bc) / 0.6)',
          '--w-rjv-type-string-color': 'hsl(var(--su))',
          '--w-rjv-type-int-color': 'hsl(var(--in))',
          '--w-rjv-type-float-color': 'hsl(var(--in))',
          '--w-rjv-type-boolean-color': 'hsl(var(--wa))',
          '--w-rjv-type-null-color': 'hsl(var(--bc) / 0.4)',
          '--w-rjv-type-date-color': 'hsl(var(--ac))',
          '--w-rjv-arrow-color': 'hsl(var(--bc) / 0.5)',
          '--w-rjv-info-color': 'hsl(var(--bc) / 0.5)',
          '--w-rjv-property-color': 'hsl(var(--bc))',
        } as React.CSSProperties
      }
    />
  </div>
);
