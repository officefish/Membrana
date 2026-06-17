import React from 'react';

import { STRICTNESS_LABELS } from '../fft-threshold-test/types';

import { requestSampleLibraryFftThresholdAnalysis } from './sampleLibraryFftThresholdPluginState';
import { useSampleLibraryFftThresholdTest } from './useSampleLibraryFftThresholdTest';

export interface SampleLibraryFftThresholdTestPanelProps {
  readonly moduleId: string;
}

function tickClass(passed: boolean): string {
  return passed
    ? 'inline-block h-3 w-3 rounded-full bg-success'
    : 'inline-block h-3 w-3 rounded-full bg-error/70';
}

export const SampleLibraryFftThresholdTestPanel: React.FC<
  SampleLibraryFftThresholdTestPanelProps
> = ({ moduleId: _moduleId }) => {
  const snapshot = useSampleLibraryFftThresholdTest();
  const hasSample = Boolean(snapshot.selectedSampleId);
  const showResult =
    snapshot.status === 'ready' &&
    snapshot.report !== null &&
    snapshot.analyzedSampleId === snapshot.selectedSampleId;
  const report = snapshot.report;

  return (
    <section
      className="card card-bordered bg-base-100 shadow-sm"
      role="region"
      aria-label="FFT пороговый тест по сэмплу библиотеки"
    >
      <div className="card-body gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="card-title text-base">FFT пороговый тест</h3>
          <button
            type="button"
            className="btn btn-sm btn-primary ml-auto"
            disabled={!hasSample || snapshot.status === 'loading'}
            onClick={() => requestSampleLibraryFftThresholdAnalysis()}
          >
            {snapshot.status === 'loading' ? (
              <span className="loading loading-spinner loading-xs" aria-hidden />
            ) : null}
            Прогнать сэмпл
          </button>
        </div>

        {snapshot.selectedSampleTitle ? (
          <p className="text-sm text-base-content/70">
            Сэмпл: <span className="font-medium">{snapshot.selectedSampleTitle}</span>
          </p>
        ) : null}

        {!hasSample ? (
          <p className="text-sm text-base-content/60">Выберите и воспроизведите сэмпл.</p>
        ) : null}

        {snapshot.status === 'error' && snapshot.errorMessage ? (
          <div className="alert alert-error text-sm" role="alert">
            {snapshot.errorMessage}
          </div>
        ) : null}

        {hasSample && snapshot.status === 'loading' ? (
          <p className="text-sm text-base-content/60" aria-live="polite">
            Прогон порогового теста…
          </p>
        ) : null}

        {hasSample &&
        !showResult &&
        snapshot.status !== 'loading' &&
        snapshot.status !== 'error' ? (
          <p className="text-sm text-base-content/60">
            Дождитесь конца воспроизведения или нажмите «Прогнать сэмпл».
          </p>
        ) : null}

        {showResult && report ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`badge ${report.isDetected ? 'badge-warning' : 'badge-ghost'}`}
              >
                {report.isDetected ? 'порог пройден' : 'ниже порога'}
              </span>
              <span className="text-sm text-base-content/70 tabular-nums">
                {report.passedCount}/{report.frameCount} кадров ·{' '}
                {Math.round(report.passRate * 100)}%
              </span>
              <span className="badge badge-ghost badge-sm">
                {STRICTNESS_LABELS[report.strictness]}
              </span>
            </div>

            <div className="flex items-center gap-1.5" aria-label="Кадры теста">
              {report.frames.map((frame) => (
                <span
                  key={frame.index}
                  className={tickClass(frame.framePassed)}
                  title={`Кадр ${frame.index + 1}: centroid ${Math.round(
                    frame.centroidHz,
                  )} Гц, flux ${frame.fluxRaw.toFixed(2)}, rms ${frame.rmsRaw.toFixed(3)}`}
                />
              ))}
            </div>

            <p className="text-xs text-base-content/50 tabular-nums">
              centroid [{report.thresholds.centroid.min}, {report.thresholds.centroid.max}] Гц ·
              flux [{report.thresholds.flux.min}, {report.thresholds.flux.max}] · rms [
              {report.thresholds.rms.min}, {report.thresholds.rms.max}]
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
};
