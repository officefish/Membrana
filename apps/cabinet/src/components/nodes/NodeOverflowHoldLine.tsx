import type { RuntimeOverflowHoldPayload } from '@membrana/core';

import { type NodeVitality } from '@/lib/nodeCardStatus';

export interface NodeOverflowHoldLineProps {
  readonly vitality: NodeVitality;
  readonly hold: RuntimeOverflowHoldPayload | null | undefined;
}

function formatOverflowAt(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * M4 (б)/#2309: строка карточки узла «жив · не пишет · буфер полон» вместо «нет телеметрии».
 * Таблица код→текст причин — у окна оператора (4/4, M5); здесь причина — сырой код приглушённо,
 * чтобы не заводить вторую копию словаря. Проводка в NodesPage — на интеграции.
 */
export function NodeOverflowHoldLine({ vitality, hold }: NodeOverflowHoldLineProps) {
  if (vitality === 'dead' || hold == null) return null;
  const confirmed = vitality === 'stopped_buffer_full';
  return (
    <div
      className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs"
      role="status"
      aria-live="polite"
      data-testid="node-overflow-hold"
      data-vitality={vitality}
    >
      <span className="badge badge-warning badge-xs">жив · не пишет</span>
      <span className="font-medium">буфер полон</span>
      <span className="text-base-content/50" title="код причины с сервера записей">
        {hold.reason}
      </span>
      {confirmed ? (
        <span className="text-base-content/70">с {formatOverflowAt(hold.overflowAt)}</span>
      ) : (
        <span className="text-base-content/50">эпизод ещё не подтверждён сервером</span>
      )}
    </div>
  );
}
