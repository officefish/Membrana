import React from 'react';

import type { LoudnessTrend } from '@membrana/fft-analyzer-service';

import { useMicProximityAlarm } from './useMicProximityAlarm';

export interface MicProximityAlarmPanelProps {
  moduleId: string;
}

const TREND_VIEW: Record<LoudnessTrend, { label: string; icon: string; tone: string }> = {
  approaching: { label: 'Приближается', icon: '▲', tone: 'text-warning' },
  receding: { label: 'Удаляется', icon: '▼', tone: 'text-info' },
  stable: { label: 'Стабильно', icon: '＝', tone: 'text-base-content/70' },
};

export const MicProximityAlarmPanel: React.FC<MicProximityAlarmPanelProps> = () => {
  const { live, trend, loudness, ready, combinedScore, hasCombinedSource, alarm } =
    useMicProximityAlarm();
  const view = TREND_VIEW[trend];
  const loudnessPercent = Math.min(100, Math.round(loudness * 100));

  return (
    <div className="rounded-box border border-primary/30 bg-base-200/30 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-base-content">Alarm-loop «ближе/дальше»</h3>
        <p className="text-xs text-base-content/60 mt-0.5">
          Тренд громкости живого потока. Это <strong>грубая громкость сцены</strong> — не координата
          и не расстояние.
        </p>
      </div>

      {!live && (
        <p className="text-xs text-center text-base-content/50 py-2">
          Запустите поток микрофона, чтобы увидеть тренд.
        </p>
      )}

      {live && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-xl leading-none ${view.tone}`} aria-hidden>
              {view.icon}
            </span>
            <span className={`text-base font-medium ${view.tone}`}>{view.label}</span>
            {!ready && (
              <span className="text-[10px] text-base-content/40">(накопление окна…)</span>
            )}
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-base-content/60 mb-1">
              <span>Громкость</span>
              <span>{loudnessPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-base-300 overflow-hidden">
              <div
                className="h-full bg-primary/70 transition-[width] duration-150"
                style={{ width: `${loudnessPercent}%` }}
              />
            </div>
          </div>

          <div
            className="rounded-box border border-base-300 bg-base-100/40 px-3 py-2"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-base-content/70">Тревога (combined)</span>
              {hasCombinedSource ? (
                <span
                  className={`text-xs font-semibold ${
                    alarm.active ? 'text-error' : 'text-base-content/50'
                  }`}
                >
                  {alarm.active
                    ? alarm.rising
                      ? 'Активна · усиливается'
                      : alarm.easing
                        ? 'Активна · ослабевает'
                        : 'Активна'
                    : 'Нет'}
                </span>
              ) : (
                <span className="text-xs text-base-content/40">
                  ожидает combined-плагин (score {combinedScore.toFixed(2)})
                </span>
              )}
            </div>
            <p className="text-[10px] text-base-content/45 mt-1">
              Порог тревоги завязан на combinedScore из fusion спектр+нейро, не на самой громкости.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
