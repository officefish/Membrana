import type React from 'react';

import type { TelemetryEntry } from '@membrana/telemetry-service';

export interface ReportRendererProps {
  readonly entry: TelemetryEntry;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}

export type ReportRenderer = (props: ReportRendererProps) => React.ReactNode;

const renderers = new Map<string, ReportRenderer>();

export function registerReportRenderer(schema: string, renderer: ReportRenderer): void {
  renderers.set(schema, renderer);
}

export function resolveReportRenderer(entry: TelemetryEntry): ReportRenderer | null {
  if (entry.type !== 'analysis') return null;
  const schema = entry.data['schema'];
  if (typeof schema !== 'string') return null;
  return renderers.get(schema) ?? null;
}
