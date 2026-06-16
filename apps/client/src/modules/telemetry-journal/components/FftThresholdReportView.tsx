import React from 'react';

import { FrameTickStrip } from '../../../components/fft-reports/FrameTickStrip';
import { ReportMatrix } from '../../../components/fft-reports/ReportMatrix';
import type { FftThresholdTestReport } from '../../../plugins/fft-threshold-test/buildFftThresholdTestReport';
import { STRICTNESS_LABELS } from '../../../plugins/fft-threshold-test/types';

export interface FftThresholdReportViewProps {
  readonly report: FftThresholdTestReport;
}

/**
 * Expanded journal view for the FFT threshold test report (LP2). Mirrors the
 * microphone plugin `ReportCard`: a per-frame ✓/✗ strip, a meta line and the
 * full normalized metric matrix.
 */
export const FftThresholdReportView: React.FC<FftThresholdReportViewProps> = ({ report }) => {
  const modeLabel = report.mode === 'auto' ? 'авто' : 'ручной';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-base-content/60">
        <FrameTickStrip frames={report.frames} />
        <span className="tabular-nums">
          {report.passedCount}/{report.frameCount} кадров
        </span>
      </div>
      <p className="text-[10px] text-base-content/60">
        {modeLabel} · {STRICTNESS_LABELS[report.strictness]} · интервал {report.intervalMs} мс ·{' '}
        {Math.round(report.passRate * 100)}% кадров
      </p>
      <ReportMatrix report={report} />
    </div>
  );
};
