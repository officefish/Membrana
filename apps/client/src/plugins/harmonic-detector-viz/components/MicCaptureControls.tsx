import { SensitivityThresholdSlider } from './SensitivityThresholdSlider.js';

interface Props {
  readonly isLive: boolean;
  readonly captureError: string | null;
  readonly confidenceThreshold: number;
  readonly onThresholdChange: (value: number) => void;
  readonly onStart: () => void;
  readonly onStop: () => void;
  readonly showThreshold?: boolean;
}

export function MicCaptureControls({
  isLive,
  captureError,
  confidenceThreshold,
  onThresholdChange,
  onStart,
  onStop,
  showThreshold = true,
}: Props) {
  return (
    <div className="flex flex-col gap-3 shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`btn min-h-10 ${isLive ? 'btn-error' : 'btn-primary'}`}
          onClick={() => {
            if (isLive) onStop();
            else void onStart();
          }}
        >
          {isLive ? 'Остановить поток' : 'Запустить поток'}
        </button>
        <span
          className={`badge gap-1.5 ${
            isLive ? 'badge-success badge-outline' : 'badge-ghost'
          }`}
        >
          {isLive ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" aria-hidden />
              Слушаем
            </>
          ) : (
            'Ожидание'
          )}
        </span>
      </div>

      {captureError != null ? (
        <p className="text-xs text-error" role="alert">
          {captureError}
        </p>
      ) : null}

      {showThreshold ? (
        <SensitivityThresholdSlider
          value={confidenceThreshold}
          onChange={onThresholdChange}
        />
      ) : null}
    </div>
  );
}
