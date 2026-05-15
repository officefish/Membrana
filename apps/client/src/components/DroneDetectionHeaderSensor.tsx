import React, { useEffect, useState } from 'react';

import { useDroneDetectionSensor } from '../hooks/useDroneDetectionSensor';

const PULSE_MS = 600;
export const DRONE_DETECTED_LABEL = 'Обнаружен дрон';

export const DroneDetectionHeaderSensor: React.FC = () => {
  const { phase, lastEvent, progress, fadeDurationMs, onFadeTransitionEnd } =
    useDroneDetectionSensor();
  const [pulse, setPulse] = useState(false);

  const isActive = phase === 'active';
  const isFading = phase === 'fading';
  const alertVisible = isActive || isFading;

  useEffect(() => {
    if (!isActive || lastEvent == null) {
      return;
    }
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), PULSE_MS);
    return () => clearTimeout(timer);
  }, [isActive, lastEvent?.timestamp]);

  const labelOpacity = isActive ? 1 : isFading ? 0.35 : 0;
  const fadeMs = fadeDurationMs;

  const title =
    lastEvent != null
      ? `Последнее срабатывание: ${lastEvent.sourceLabel}`
      : 'Датчик детекции дрона';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        alertVisible
          ? `${DRONE_DETECTED_LABEL}${lastEvent ? `: ${lastEvent.sourceLabel}` : ''}`
          : 'Датчик детекции дрона, ожидание'
      }
      title={title}
      className="flex min-w-0 max-w-[11rem] flex-col items-stretch gap-0.5 sm:max-w-[12.5rem]"
    >
      <div
        className={[
          'flex items-center rounded-full border-2 px-1 py-1 transition-[border-color,background-color,box-shadow,padding] ease-out',
          alertVisible
            ? isFading
              ? 'border-error/45 bg-error/5 pr-2'
              : 'border-error bg-error/10 pr-2 shadow-[0_0_12px_rgba(248,113,113,0.4)]'
            : 'border-base-300/80 bg-base-300/15',
        ].join(' ')}
      >
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center md:h-8 md:w-8">
          {pulse ? (
            <span
              className="absolute inset-0 rounded-full bg-error/30 animate-ping"
              style={{
                animationDuration: `${PULSE_MS}ms`,
                animationIterationCount: 1,
              }}
              aria-hidden
            />
          ) : null}
          <span
            className={`relative block h-3 w-3 rounded-full transition-colors duration-200 ${
              isActive
                ? 'bg-error'
                : isFading
                  ? 'bg-error/50'
                  : 'bg-base-content/35'
            }`}
            aria-hidden
          />
        </span>

        <span
          className={[
            'overflow-hidden whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-wide text-error transition-[max-width,opacity,margin] ease-out',
            alertVisible ? 'ml-1.5 max-w-[9rem]' : 'ml-0 max-w-0',
          ].join(' ')}
          style={{
            opacity: labelOpacity,
            transitionDuration: isFading ? `${fadeMs}ms` : '250ms',
          }}
          aria-hidden={!alertVisible}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && isFading) {
              onFadeTransitionEnd();
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
        ].join(' ')}
        style={{
          opacity: alertVisible ? labelOpacity : 0,
          transitionDuration: isFading ? `${fadeMs}ms` : '250ms',
        }}
        aria-hidden={!alertVisible}
      >
        <div
          className="h-full rounded-full bg-error/90 transition-[width] duration-75 ease-linear"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
};
