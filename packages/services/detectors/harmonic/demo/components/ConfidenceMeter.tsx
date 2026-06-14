interface Props {
  readonly confidence: number | null;
  readonly threshold?: number;
}

export function ConfidenceMeter({ confidence, threshold = 0.55 }: Props) {
  const pct = confidence == null ? 0 : Math.round(confidence * 100);
  const thresholdPct = Math.round(threshold * 100);
  const barClass =
    pct >= thresholdPct ? 'bg-success' : pct >= thresholdPct - 15 ? 'bg-warning' : 'bg-base-content/30';

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-base-content/70">Confidence</span>
        <span className="font-mono">{confidence == null ? '—' : `${pct}%`}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-base-300 overflow-hidden">
        <div
          className={`h-full transition-[width,background-color] duration-500 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
