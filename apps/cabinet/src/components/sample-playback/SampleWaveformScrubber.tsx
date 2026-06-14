import { useCallback, useId, useRef } from 'react';

import { ratioToOffsetSec } from '@/lib/sampleWaveform';

export interface SampleWaveformScrubberProps {
  readonly waveform: readonly number[];
  readonly currentTimeSec: number;
  readonly durationSec: number;
  readonly onSeek: (ratio: number) => void;
  readonly height?: number;
  readonly compact?: boolean;
}

export function SampleWaveformScrubber({
  waveform,
  currentTimeSec,
  durationSec,
  onSeek,
  height = 120,
  compact = false,
}: SampleWaveformScrubberProps) {
  const rawId = useId().replace(/:/g, '');
  const gradientId = `swf-grad-${rawId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const lastSeekAtRef = useRef(0);

  const progressRatio =
    durationSec > 0 ? Math.max(0, Math.min(1, currentTimeSec / durationSec)) : 0;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el || durationSec <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const now = Date.now();
      if (now - lastSeekAtRef.current < 50) return;
      lastSeekAtRef.current = now;
      onSeek(ratio);
    },
    [durationSec, onSeek],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    scrubbingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!scrubbingRef.current) return;
    seekFromClientX(event.clientX);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    scrubbingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (durationSec <= 0) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = Math.max(0, currentTimeSec - 1);
      onSeek(next / durationSec);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = Math.min(durationSec, currentTimeSec + 1);
      onSeek(next / durationSec);
    }
  };

  const midY = height / 2;
  const width = 560;
  const points = waveform
    .map((value, index) => {
      const x = (index / Math.max(waveform.length - 1, 1)) * width;
      const y = midY - value * (midY - (compact ? 6 : 10));
      return `${x},${y}`;
    })
    .join(' L ');
  const pathData = points.length ? `M ${points}` : '';

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="Позиция воспроизведения"
      aria-valuemin={0}
      aria-valuemax={durationSec}
      aria-valuenow={currentTimeSec}
      aria-valuetext={`${ratioToOffsetSec(progressRatio, durationSec).toFixed(1)} секунд`}
      className="relative w-full cursor-pointer overflow-hidden rounded-lg border border-base-300 bg-base-300/50"
      style={{ height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="block"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--p))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--p))" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={midY}
          x2={width}
          y2={midY}
          stroke="hsl(var(--bc) / 0.15)"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        {pathData ? (
          <path
            d={pathData}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={compact ? 1 : 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 bg-primary/15"
        style={{ width: `${progressRatio * 100}%` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary"
        style={{ left: `${progressRatio * 100}%` }}
      />
    </div>
  );
}
