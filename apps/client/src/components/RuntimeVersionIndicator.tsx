import React, { useMemo } from 'react';
import {
  computeVersionIndicator,
  type ServerRuntimeInfo,
  type VersionIndicatorTone,
} from '../lib/runtimeVersion';

const TONE_CLASS: Record<VersionIndicatorTone, string> = {
  neutral: 'text-base-content/40',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export interface RuntimeVersionIndicatorProps {
  /** Версия приложения (build), напр. из package.json / import.meta.env. */
  appVersion: string;
  /** Данные сервера из /health; null пока не загружено/недоступно. */
  server?: ServerRuntimeInfo | null;
}

/**
 * DR6: индикатор версии приложения и совместимости рантайм-протокола с сервером.
 * Презентация без бизнес-логики — состояние считает computeVersionIndicator (покрыто тестами).
 */
export const RuntimeVersionIndicator: React.FC<RuntimeVersionIndicatorProps> = ({
  appVersion,
  server = null,
}) => {
  const ind = useMemo(
    () => computeVersionIndicator(appVersion, server),
    [appVersion, server],
  );
  // Об изменениях, требующих внимания (обновление/несовместимость), сообщаем ассистивным технологиям.
  const needsAttention = ind.state === 'update-available' || ind.state === 'server-outdated';

  return (
    <span
      className={`shrink-0 text-[9px] tabular-nums ${TONE_CLASS[ind.tone]}`}
      title={ind.title}
      aria-label={ind.title}
      aria-live={needsAttention ? 'polite' : undefined}
      role={needsAttention ? 'status' : undefined}
      data-state={ind.state}
    >
      {ind.label}
    </span>
  );
};
