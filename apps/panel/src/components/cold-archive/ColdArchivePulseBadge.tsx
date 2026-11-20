import type { ColdArchivePulse } from '@/lib/coldArchiveApi';

/**
 * #2632 g6b (Т1, Т6): значок пульса уборщика — иконка + текст, тревога при `stale`.
 * Данные — проп (ответ ручки office g5b `pulse`); загрузку делает вкладка g6c. `pulse === null` — пульс не получен:
 * значок честно говорит «состояние неизвестно», а не «всё хорошо».
 */

const MODE_TEXT: Record<ColdArchivePulse['mode'], string> = {
  disabled: 'уборка выключена',
  'dry-run': 'пробный режим — файлы не удаляются',
  live: 'боевой режим',
};

function formatAt(iso: string | null): string {
  if (!iso) return 'ни одного';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ru-RU');
}

export function ColdArchivePulseBadge({ pulse }: { pulse: ColdArchivePulse | null }) {
  if (!pulse) {
    return (
      <div role="status" className="alert" data-pulse="unknown">
        <span aria-hidden="true">○</span>
        <span>Пульс уборщика не получен — состояние неизвестно.</span>
      </div>
    );
  }
  const last = `Последний успешный прогон: ${formatAt(pulse.lastSucceededRunAt)}.`;
  if (pulse.pulse === 'stale') {
    return (
      <div role="alert" className="alert alert-warning" data-pulse="stale">
        <span aria-hidden="true">⚠</span>
        <span>
          Тревога: уборщик молчит больше {Math.round(pulse.staleAfterMs / 3_600_000)} ч ({MODE_TEXT[pulse.mode]}). {last}
        </span>
      </div>
    );
  }
  const ok = pulse.pulse === 'ok';
  return (
    <div role="status" aria-live="polite" className={`alert ${ok ? 'alert-success' : ''}`} data-pulse={pulse.pulse}>
      <span aria-hidden="true">{ok ? '●' : '○'}</span>
      <span>
        {ok ? `Уборщик работает (${MODE_TEXT[pulse.mode]}).` : `Пульса нет: ${MODE_TEXT.disabled}.`} {last}
      </span>
    </div>
  );
}
