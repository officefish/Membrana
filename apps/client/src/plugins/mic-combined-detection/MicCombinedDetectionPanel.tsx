import React from 'react';

import { useMicCombinedDetection } from './useMicCombinedDetection';

export interface MicCombinedDetectionPanelProps {
  moduleId: string;
}

export const MicCombinedDetectionPanel: React.FC<MicCombinedDetectionPanelProps> = () => {
  const { live, combinedScore, smoothedScore, agreement, presentCount, perSource } =
    useMicCombinedDetection();
  const scorePercent = Math.min(100, Math.round(smoothedScore * 100));
  const agreementPercent = Math.min(100, Math.round(agreement * 100));

  return (
    <div className="rounded-box border border-primary/30 bg-base-200/30 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-base-content">Combined-детекция</h3>
        <p className="text-xs text-base-content/60 mt-0.5">
          <strong>combinedScore</strong> — взвешенное среднее сырого confidence детекторов
          (fusion-ядро), а не бинарный OR. Источник тревоги для alarm-loop.
        </p>
      </div>

      {!live && (
        <p className="text-xs text-center text-base-content/50 py-2">
          Запустите поток микрофона, чтобы увидеть combinedScore.
        </p>
      )}

      {live && (
        <div className="space-y-3" role="status" aria-live="polite">
          <div>
            <div className="flex justify-between text-[11px] text-base-content/60 mb-1">
              <span>combinedScore {presentCount > 0 ? '' : '(нет источников)'}</span>
              <span>{scorePercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-base-300 overflow-hidden">
              <div
                className="h-full bg-primary/70 transition-[width] duration-150"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <p className="text-[10px] text-base-content/45 mt-1">
              мгновенный {combinedScore.toFixed(2)} · сглаженный {smoothedScore.toFixed(2)} ·
              согласие {agreementPercent}%
            </p>
          </div>

          {perSource.length > 0 && (
            <ul className="space-y-1">
              {perSource.map((source) => (
                <li
                  key={source.name}
                  className="flex items-center justify-between text-[11px] text-base-content/70"
                >
                  <span>
                    {source.name}{' '}
                    <span className="text-base-content/40">({source.family})</span>
                  </span>
                  <span className={source.present ? '' : 'text-base-content/30'}>
                    {source.present ? source.confidence.toFixed(2) : 'молчит'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
