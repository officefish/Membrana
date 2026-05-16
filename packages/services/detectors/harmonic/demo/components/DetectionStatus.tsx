import type { LiveHarmonicDetection } from '../hooks/useLiveHarmonicDetection.js';

interface Props {
  readonly detection: LiveHarmonicDetection | null;
  readonly isRunning: boolean;
}

export function DetectionStatus({ detection, isRunning }: Props) {
  if (!isRunning) {
    return (
      <div className="alert min-h-[4.5rem] py-3">
        <span className="text-base-content/70">Микрофон выключен</span>
      </div>
    );
  }

  if (detection == null) {
    return (
      <div className="alert min-h-[4.5rem] py-3">
        <span className="loading loading-spinner loading-md" />
        <span>Слушаем…</span>
      </div>
    );
  }

  const alertClass = detection.isDrone ? 'alert alert-success' : 'alert';

  return (
    <div
      className={`${alertClass} min-h-[4.5rem] py-3 transition-all duration-500 ease-in-out`}
      role="status"
      aria-live="polite"
    >
      <span className="text-2xl font-semibold transition-opacity duration-500">
        {detection.isDrone ? 'Дрон обнаружен' : 'Дрон не обнаружен'}
      </span>
    </div>
  );
}
