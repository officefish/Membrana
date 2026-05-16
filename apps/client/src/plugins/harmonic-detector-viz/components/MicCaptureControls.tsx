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
        <label className="form-control w-full max-w-xs">
          <div className="label py-0">
            <span className="label-text">Порог confidence</span>
            <span className="label-text-alt font-mono text-warning">
              {Math.round(confidenceThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={0.9}
            step={0.01}
            value={confidenceThreshold}
            className="range range-warning range-sm"
            onChange={(e) => onThresholdChange(Number(e.target.value))}
          />
        </label>
      ) : null}
    </div>
  );
}
