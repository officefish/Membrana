import React from 'react';

import { ReportMatrix } from '../../../components/fft-reports/ReportMatrix';
import { STRICTNESS_LABELS } from '../../../plugins/fft-threshold-test/types';
import { fftThresholdReportFromEntry } from '../adapters/fftThresholdReportFromEntry';
import { TelemetryReportCard } from '../components/TelemetryReportCard';
import { JournalEntryRow } from '../components/JournalEntryRow';

import type { ReportRendererProps } from './registry';

export const FftThresholdTelemetryReportCard: React.FC<ReportRendererProps> = ({
  entry,
  expanded,
  onToggle,
}) => {
  const report = fftThresholdReportFromEntry(entry);
  if (!report) {
    return <JournalEntryRow entry={entry} />;
  }

  const modeLabel = report.mode === 'auto' ? 'авто' : 'ручной';
  const jsonPayload = entry.data as Record<string, unknown>;

  return (
    <TelemetryReportCard
      report={report}
      expanded={expanded}
      onToggle={onToggle}
      jsonPayload={jsonPayload}
      meta={
        <p className="text-[10px] text-base-content/60">
          {modeLabel} · {STRICTNESS_LABELS[report.strictness]} · интервал {report.intervalMs} мс ·{' '}
          {(report.passRate * 100).toFixed(0)}% кадров
        </p>
      }
      matrix={<ReportMatrix report={report} />}
    />
  );
};
