import type { LiveSamplerState } from '@membrana/audio-engine-service';

interface Props {
  readonly micState: LiveSamplerState;
  readonly isRunning: boolean;
  readonly confidenceThreshold: number;
  readonly onThresholdChange: (value: number) => void;
  readonly onStart: () => void;
  readonly onStop: () => void;
}

export function MicControls({
  micState,
  isRunning,
  confidenceThreshold,
  onThresholdChange,
  onStart,
  onStop,
}: Props) {
  const busy = micState === 'starting';

  return (
    <div className="flex flex-col gap-3 shrink-0">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={isRunning || busy}
          onClick={() => void onStart()}
        >
          {busy ? 'Запуск…' : 'Старт микрофона'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!isRunning || busy}
          onClick={() => void onStop()}
        >
          Стоп
        </button>
        <span className="badge badge-outline self-center capitalize">{micState}</span>
      </div>

      <label className="form-control w-full max-w-xs">
        <div className="label">
          <span className="label-text">Порог confidence</span>
          <span className="label-text-alt font-mono">{Math.round(confidenceThreshold * 100)}%</span>
        </div>
        <input
          type="range"
          min={0.2}
          max={0.9}
          step={0.01}
          value={confidenceThreshold}
          className="range range-primary range-sm"
          onChange={(e) => onThresholdChange(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
