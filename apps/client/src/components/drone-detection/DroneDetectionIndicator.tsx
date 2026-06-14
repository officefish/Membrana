import { useEffect, useState } from 'react';

import type { DroneSensorPhase } from '../../lib/droneDetectionSensorState';
import { DRONE_DETECTED_LABEL, DRONE_INDICATOR_PULSE_MS } from './constants';

export interface DroneDetectionIndicatorProps {
  readonly phase: DroneSensorPhase;
  /** 0…1 — полоса удержания под pill (как в шапке). */
  readonly progress?: number;
  readonly fadeDurationMs?: number;
  readonly onFadeTransitionEnd?: () => void;
  /** Смена значения запускает однократный ping (новое срабатывание). */
  readonly pulseAt?: number;
  readonly title?: string;
  /** header — узкая колонка в AppHeader; panel — на всю ширину блока плагина. */
  readonly layout?: 'header' | 'panel';
}

export function DroneDetectionIndicator({
  phase,
  progress = 0,
  fadeDurationMs = 3000,
  onFadeTransitionEnd,
  pulseAt,
  title,
  layout = 'header',
}: DroneDetectionIndicatorProps) {
  const [pulse, setPulse] = useState(false);

  const isActive = phase === 'active';
  const isFading = phase === 'fading';
  const alertVisible = isActive || isFading;

  useEffect(() => {
    if (!isActive || pulseAt == null) {
      return;
    }
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), DRONE_INDICATOR_PULSE_MS);
    return () => clearTimeout(timer);
  }, [isActive, pulseAt]);

  const labelOpacity = isActive ? 1 : isFading ? 0.35 : 0;
  const fadeMs = fadeDurationMs;

  const dotSize = layout === 'panel' ? 'h-4 w-4' : 'h-3 w-3';
  const ringSize = layout === 'panel' ? 'h-9 w-9' : 'h-7 w-7 md:h-8 md:w-8';

  const rootClass =
    layout === 'header'
      ? 'flex min-w-0 max-w-[11rem] flex-col items-stretch gap-0.5 sm:max-w-[12.5rem]'
      : 'flex w-full max-w-md flex-col items-stretch gap-1';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={alertVisible ? DRONE_DETECTED_LABEL : title ?? 'Датчик детекции дрона, ожидание'}
      title={title}
      className={rootClass}
    >
      <div
        className={[
          'flex items-center rounded-full border-2 px-1 py-1 transition-[border-color,background-color,box-shadow,padding] ease-out',
          layout === 'panel' ? 'w-full max-w-sm' : '',
          alertVisible
            ? isFading
              ? 'border-error/45 bg-error/5 pr-2'
              : 'border-error bg-error/10 pr-2 shadow-[0_0_12px_rgba(248,113,113,0.4)]'
            : 'border-base-300/80 bg-base-300/15',
        ].join(' ')}
      >
        <span className={`relative flex shrink-0 items-center justify-center ${ringSize}`}>
          {pulse ? (
            <span
              className="absolute inset-0 rounded-full bg-error/30 animate-ping"
              style={{
                animationDuration: `${DRONE_INDICATOR_PULSE_MS}ms`,
                animationIterationCount: 1,
              }}
              aria-hidden
            />
          ) : null}
          <span
            className={`relative block rounded-full transition-colors duration-200 ${dotSize} ${
              isActive ? 'bg-error' : isFading ? 'bg-error/50' : 'bg-base-content/35'
            }`}
            aria-hidden
          />
        </span>

        <span
          className={[
            'overflow-hidden whitespace-nowrap font-semibold uppercase leading-none tracking-wide text-error transition-[max-width,opacity,margin] ease-out',
            layout === 'panel' ? 'text-xs' : 'text-[10px]',
            alertVisible ? 'ml-1.5 max-w-[12rem]' : 'ml-0 max-w-0',
          ].join(' ')}
          style={{
            opacity: labelOpacity,
            transitionDuration: isFading ? `${fadeMs}ms` : '250ms',
          }}
          aria-hidden={!alertVisible}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && isFading) {
              onFadeTransitionEnd?.();
            }
          }}
        >
          {DRONE_DETECTED_LABEL}
        </span>
      </div>

      <div
        className={[
          'h-px overflow-hidden rounded-full bg-base-300/40 transition-[max-height,opacity] ease-out',
          alertVisible ? 'max-h-px' : 'max-h-0',
          layout === 'panel' ? 'max-w-sm' : '',
        ].join(' ')}
        style={{
          opacity: alertVisible ? labelOpacity : 0,
          transitionDuration: isFading ? `${fadeMs}ms` : '250ms',
        }}
        aria-hidden={!alertVisible}
      >
        <div
          className="h-full rounded-full bg-error/90 transition-[width] duration-75 ease-linear"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
        />
      </div>
    </div>
  );
}
