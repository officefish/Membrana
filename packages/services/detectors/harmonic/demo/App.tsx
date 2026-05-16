import { DetectionDetails } from './components/DetectionDetails.js';
import { DetectionStatus } from './components/DetectionStatus.js';
import { ConfidenceMeter } from './components/ConfidenceMeter.js';
import { MicControls } from './components/MicControls.js';
import { useLiveHarmonicDetection } from './hooks/useLiveHarmonicDetection.js';

export function App() {
  const {
    micState,
    isRunning,
    detection,
    error,
    confidenceThreshold,
    setConfidenceThreshold,
    start,
    stop,
  } = useLiveHarmonicDetection();

  return (
    <div className="h-full flex flex-col gap-4 max-w-lg mx-auto w-full">
      <header className="shrink-0">
        <p className="text-xs uppercase tracking-wide text-base-content/50">Membrana · DSP lab</p>
        <h1 className="text-2xl font-bold leading-tight">Harmonic Drone Lab</h1>
        <p className="text-sm text-base-content/70 mt-0.5">
          Гармонический классификатор мультиротора (80–250&nbsp;Гц).
        </p>
      </header>

      <div className="card bg-base-100 shadow-xl flex-1 min-h-0 flex flex-col">
        <div className="card-body gap-4 flex-1 min-h-0 flex flex-col p-5">
          <DetectionStatus detection={detection} isRunning={isRunning} />
          <ConfidenceMeter
            confidence={detection?.confidence ?? null}
            threshold={confidenceThreshold}
          />
          <MicControls
            micState={micState}
            isRunning={isRunning}
            confidenceThreshold={confidenceThreshold}
            onThresholdChange={setConfidenceThreshold}
            onStart={start}
            onStop={stop}
          />
          <div className="min-h-0 shrink-0" aria-live="polite">
            {error != null ? (
              <div className="alert alert-error text-sm py-2" role="alert">
                {error}
              </div>
            ) : null}
          </div>
          <DetectionDetails
            reasoning={detection?.reasoning}
            fundamentals={detection?.fundamentals}
          />
          <p className="text-xs text-base-content/50 font-mono shrink-0 mt-auto pt-1">
            latency{' '}
            {detection?.latencyMs != null ? `${detection.latencyMs.toFixed(1)} ms` : '—'}
          </p>
        </div>
      </div>

      <footer className="text-xs text-base-content/50 shrink-0 leading-snug">
        FFT 2048 · сглаживание статуса (EMA, гистерезис, 3/6 кадров). Проверка: тишина, речь, запись
        пропеллера.
      </footer>
    </div>
  );
}
