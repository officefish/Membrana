import { useState } from 'react';
import type { TelemetryReportView } from '@/api/journal';

const FFT_SCHEMA = 'fft-threshold-test/v0.2';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface CloudReportCardProps {
  report: TelemetryReportView;
}

/** Renders cloud report using the same payload fields as client journal cards. */
export function CloudReportCard({ report }: CloudReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const payload = report.payload;
  const isFft = report.reportKind === FFT_SCHEMA && isRecord(payload);
  const isDetected = isFft && payload.isDetected === true;
  const passRate = isFft && typeof payload.passRate === 'number' ? payload.passRate : null;
  const frameCount = isFft && typeof payload.frameCount === 'number' ? payload.frameCount : null;
  const passedCount = isFft && typeof payload.passedCount === 'number' ? payload.passedCount : null;

  return (
    <article
      className={`rounded-lg border ${
        isDetected ? 'border-success/30 bg-success/5' : 'border-base-300 bg-base-300/20'
      }`}
    >
      <header className="flex flex-wrap items-center gap-2 p-3">
        <button
          type="button"
          className="flex flex-1 min-w-0 items-center gap-2 text-left"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="text-[10px] text-base-content/50 shrink-0" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
          <span className="text-xs text-base-content/70 tabular-nums truncate">
            {formatWhen(report.finishedAt)}
          </span>
          <span className="badge badge-sm badge-outline shrink-0">{report.reportKind}</span>
          {isFft ? (
            <span
              className={`text-xs font-semibold shrink-0 ${
                isDetected ? 'text-success' : 'text-base-content'
              }`}
            >
              {isDetected ? 'Обнаружено' : 'Не обнаружено'}
            </span>
          ) : null}
          {passedCount !== null && frameCount !== null ? (
            <span className="text-[10px] text-base-content/50 tabular-nums shrink-0">
              {passedCount}/{frameCount}
              {passRate !== null ? ` (${(passRate * 100).toFixed(0)}%)` : ''}
            </span>
          ) : null}
        </button>
      </header>
      {expanded ? (
        <div className="border-t border-base-300 px-3 pb-3 pt-2 space-y-2">
          {report.moduleName ? (
            <p className="text-[10px] text-base-content/60">
              {report.moduleName}
              {report.moduleId ? ` · ${report.moduleId}` : ''}
            </p>
          ) : null}
          {report.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {report.tags.map((tag) => (
                <span key={tag} className="badge badge-ghost badge-xs">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <pre className="max-h-64 overflow-auto rounded-box border border-base-300 bg-base-300/50 p-2 text-[10px]">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </article>
  );
}
