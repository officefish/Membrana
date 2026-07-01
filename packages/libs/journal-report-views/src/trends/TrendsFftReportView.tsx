import React, { useMemo, useState } from 'react';
import {
  getTemplateFromCatalog,
  soundClassFromTemplateKey,
  type ConfidenceLevel,
  type PatternTemplate,
  type TrendsDetectionResult,
} from '@membrana/trends-detector-service';

import { TrendsMatchDetailTable } from './TrendsMatchDetailTable';
import { TrendsScoreRanking } from './TrendsScoreRanking';
import type { TrendsFftReport } from './types';

export interface TrendsFftReportViewProps {
  readonly report: TrendsFftReport;
  /**
   * Resolve a template by key. Defaults to the built-in system catalog so the
   * cabinet (no user templates) renders without extra wiring; the client passes
   * a catalog-aware getter that also includes user templates.
   */
  readonly getTemplate?: (key: string) => PatternTemplate | undefined;
}

function builtinGetTemplate(key: string): PatternTemplate | undefined {
  return getTemplateFromCatalog(key, []);
}

/**
 * Reconstruct a `TrendsDetectionResult` from the persisted journal DTO so the
 * shared sample-library renderers (`TrendsScoreRanking`, `TrendsMatchDetailTable`)
 * can be reused verbatim. The detail table only needs `scores`, `samples` and
 * `temporalFeatures`; the rest is filled from the report meta.
 */
function reconstructResult(
  report: TrendsFftReport,
  detectedStateColor: string,
): TrendsDetectionResult {
  const soundClass = report.class ?? soundClassFromTemplateKey(report.detectedState);
  const isDrone = report.isDrone ?? (soundClass === 'drone' && report.isDetected);
  return {
    class: soundClass,
    isDrone,
    isClassified: report.isClassified ?? soundClass !== 'unknown',
    detectedState: report.detectedState,
    detectedStateName: report.detectedStateName,
    detectedStateIcon: report.detectedStateIcon,
    detectedStateColor,
    confidence: report.confidence,
    confidenceLevel: report.confidenceLevel as ConfidenceLevel,
    samples: report.samples,
    isDetected: report.isDetected,
    scores: report.scores,
    temporalFeatures: report.temporalFeatures,
  };
}

/**
 * Expanded journal view for the FFT trends analyzer report (LP2/LP5). Mirrors the
 * sample-library lab view: winner verdict block, top-3 score ranking and an
 * on-demand per-template match breakdown table. Shared by client and cabinet.
 */
export const TrendsFftReportView: React.FC<TrendsFftReportViewProps> = ({
  report,
  getTemplate = builtinGetTemplate,
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const detectedStateColor = getTemplate(report.detectedState)?.color ?? '#999';
  const result = useMemo(
    () => reconstructResult(report, detectedStateColor),
    [report, detectedStateColor],
  );

  const confidencePct = Math.round(report.confidence);
  const hasBreakdown = report.temporalFeatures !== null;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {report.detectedStateIcon}
        </span>
        <div className="min-w-0">
          <div className="font-semibold" style={{ color: detectedStateColor }}>
            {report.detectedStateName}
          </div>
          <div className="text-base-content/70">
            Уверенность: {confidencePct}% ({report.confidenceLevel})
          </div>
          <div className="text-[10px] text-base-content/50">
            {report.mode === 'manual' ? 'ручной' : 'авто'} · замеров: {report.measurementsCount} ·
            интервал {report.intervalMs} мс
          </div>
        </div>
      </div>

      {report.scores.length > 0 ? (
        <TrendsScoreRanking
          scores={report.scores}
          selectedKey={selectedKey}
          onSelect={(key) => setSelectedKey((current) => (current === key ? null : key))}
          getTemplate={getTemplate}
          compact
        />
      ) : null}

      {selectedKey && hasBreakdown ? (
        <div className="rounded-lg border border-base-300 bg-base-100/40 p-2">
          <TrendsMatchDetailTable
            result={result}
            templateKey={selectedKey}
            getTemplate={getTemplate}
            compact
          />
        </div>
      ) : null}
    </div>
  );
};
