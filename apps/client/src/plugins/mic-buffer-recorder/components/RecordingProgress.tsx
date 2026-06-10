interface Props {
  readonly elapsedSec: number;
  readonly targetDurationSec: number;
  readonly label?: string;
}

export function RecordingProgress({
  elapsedSec,
  targetDurationSec,
  label = 'Запись отрезка',
}: Props) {
  const progressPercent =
    targetDurationSec > 0
      ? Math.min(100, Math.round((elapsedSec / targetDurationSec) * 100))
      : 0;

  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      <div className="flex justify-between text-xs text-base-content/70 tabular-nums">
        <span>{label}</span>
        <span>
          {elapsedSec.toFixed(1)} / {targetDurationSec} с
        </span>
      </div>
      <progress
        className="progress progress-error w-full h-3"
        value={progressPercent}
        max={100}
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${progressPercent}%`}
      />
    </div>
  );
}
