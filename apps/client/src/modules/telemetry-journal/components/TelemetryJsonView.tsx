import React from 'react';
import JsonView from '@uiw/react-json-view';

import { useJsonViewThemeStyle } from './useJsonViewThemeStyle';

export interface TelemetryJsonViewProps {
  readonly value: Record<string, unknown>;
}

/** Интерактивный просмотр JSON payload записи телеметрии (цвета DaisyUI). */
export const TelemetryJsonView: React.FC<TelemetryJsonViewProps> = ({ value }) => {
  const themeStyle = useJsonViewThemeStyle();

  return (
    <div
      className="rounded-box border border-base-300 bg-base-300/70 p-2 font-mono text-xs max-h-[min(24rem,40vh)] overflow-auto"
      data-testid="telemetry-json-view"
    >
      <JsonView
        value={value}
        collapsed={2}
        displayDataTypes={false}
        enableClipboard={false}
        style={themeStyle}
      />
    </div>
  );
};
