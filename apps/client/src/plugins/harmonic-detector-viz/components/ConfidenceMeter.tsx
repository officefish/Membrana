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
    <div className="w-full max-w-sm">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-base-content/60">Уверенность</span>
        <span className="font-mono tabular-nums text-base-content/80">
          {confidence == null ? '—' : `${pct}%`}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-base-300 overflow-visible mb-0.5">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        <span
          className="absolute top-1/2 w-px h-3 bg-base-content/40 pointer-events-none"
          style={{ left: `${thresholdPct}%`, transform: 'translate(-50%, -50%)' }}
          title={`Порог чувствительности: ${thresholdPct}%`}
          aria-hidden
        />
      </div>
      <div className="relative flex justify-between text-[10px] text-base-content/45 font-mono h-3">
        <span>0%</span>
        <span
          className="absolute whitespace-nowrap text-base-content/50"
          style={{ left: `${thresholdPct}%`, transform: 'translateX(-50%)' }}
        >
          {thresholdPct}%
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}
