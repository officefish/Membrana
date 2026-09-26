import React from 'react';

import { describeNodeRebindSteps } from '../../lib/nodeRebindSteps';

/**
 * Два действия перевязки прибора — там, где человек делает первое (#2461).
 *
 * До 26.09 панель связки говорила только про ключ доступа, и человек уходил в уверенности, что
 * прибор перевязан целиком. Второе действие — ключ узла службе-отправителю — не называлось
 * нигде; 25.09 это стоило вечернего опыта. Текст шагов живёт в `lib/nodeRebindSteps` под зубом,
 * здесь — только показ.
 */
export const NodeRebindStepsNote: React.FC<{ readonly deviceId?: string | null }> = ({ deviceId }) => (
  <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3" data-testid="node-rebind-steps">
    <p className="text-xs font-semibold text-warning-content/90">
      Перевязка прибора на другой аккаунт — два действия, не одно
    </p>
    <ol className="mt-2 space-y-2">
      {describeNodeRebindSteps(deviceId).map((step) => (
        <li key={step.n} className="text-xs text-base-content/80">
          <span className="font-semibold">
            {step.n}. {step.title}
          </span>
          <br />
          <span className="break-words">{step.detail}</span>
        </li>
      ))}
    </ol>
  </div>
);
