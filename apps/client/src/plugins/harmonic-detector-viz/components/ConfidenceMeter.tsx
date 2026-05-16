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
        <span className="font-mono tabular-nums">{confidence == null ? '—' : `${pct}%`}</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-base-300 overflow-visible mb-1">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${barClass}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        <span
          className="absolute top-1/2 w-0.5 h-4 bg-warning rounded-full pointer-events-none"
          style={{ left: `${thresholdPct}%`, transform: 'translate(-50%, -50%)' }}
          title={`Порог: ${thresholdPct}%`}
          aria-hidden
        />
      </div>
      <div className="relative flex justify-between text-[10px] text-base-content/50 font-mono h-4">
        <span>0%</span>
        <span
          className="text-warning absolute whitespace-nowrap"
          style={{ left: `${thresholdPct}%`, transform: 'translateX(-50%)' }}
        >
          ▲ {thresholdPct}%
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}
