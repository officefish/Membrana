interface Props {
  readonly reasoning?: string;
  readonly fundamentals?: readonly number[];
}

export function DetectionDetails({ reasoning, fundamentals }: Props) {
  const harmonicsLine =
    fundamentals != null && fundamentals.length > 0
      ? fundamentals.map((hz) => `${Math.round(hz)} Гц`).join(', ')
      : '—';

  const reasoningLine =
    reasoning != null && reasoning.trim().length > 0 ? reasoning.trim() : '—';

  return (
    <div className="space-y-2 border-t border-base-300 pt-3 text-sm shrink-0">
      <p className="leading-snug">
        <span className="text-base-content/60">Гармоники: </span>
        <span className="font-mono text-base-content">{harmonicsLine}</span>
      </p>
      <p className="leading-snug text-base-content/90 min-h-[2.5rem]">
        <span className="text-base-content/60">Пояснение: </span>
        <span className="line-clamp-2">{reasoningLine}</span>
      </p>
    </div>
  );
}
