import type { ColdArchivePulse } from '@/lib/coldArchiveApi';

/**
 * #2632 g6b (Т1, Т6): значок пульса уборщика — иконка + текст, тревога при `stale`.
 * Данные — проп; загрузку делает вкладка g6c. `pulse === null` — ручки пульса ещё нет (g5b не влит):
 * значок честно говорит «пульс не подключён», а не «всё хорошо». Тип — интерфейс g6a по DoD g5b.
 */

const MODE_TEXT: Record<ColdArchivePulse['mode'], string> = {
  disabled: 'уборка выключена',
  dry_run: 'пробный режим — файлы не удаляются',
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
        <span>Пульс уборщика пока не подключён — состояние неизвестно.</span>
      </div>
    );
  }
  const last = `Последний успешный прогон: ${formatAt(pulse.lastSucceededRunAt)}.`;
  if (pulse.pulse === 'stale') {
    return (
      <div role="alert" className="alert alert-warning" data-pulse="stale">
        <span aria-hidden="true">⚠</span>
        <span>
          Тревога: уборщик молчит больше 2 часов ({MODE_TEXT[pulse.mode]}). {last}
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
