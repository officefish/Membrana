/**
 * Панель управления буфером (#2204) — ОДНА на оба дома.
 *
 * Слово владельца 27.08: плагин виден и в библиотеке звуков, и в журнале — там и там человек
 * упирается в один предел. Панель поэтому не знает, чья она страница: принимает сервис и набор
 * пропами, ровно как `PagePluginArea` не знает, чью страницу оборачивает. Второй панели быть
 * не должно — две реализации одной уборки разойдутся в самом опасном месте, в удалении.
 *
 * ДВА ШАГА С ЧЕЛОВЕКОМ ПОСЕРЕДИНЕ. Сперва «показать, что уйдёт»: панель просит план у сервера
 * и рисует список с именами, временем и размером. Кнопка удаления до этого не существует —
 * не «выключена», а именно НЕ НАРИСОВАНА: выключенную кнопку человек читает как «сейчас
 * нельзя», а нам нужно «сперва посмотри». Удаление необратимо, и показ списка встроен в путь.
 *
 * ЗАЩИЩЁННЫЕ НАЗЫВАЮТСЯ. Пробы, которые отбор задел, но трогать нельзя (помечена рукой,
 * непрочитанное время), выводятся отдельным блоком с причиной. Повод — 22.08: восемь проб,
 * помянутых приёмочным документом закрытого спринта, не были помечены никак, а «самые ранние»
 * бьют по ним первыми. Человек обязан увидеть их имена ДО слова, а не после.
 *
 * НЕДОБОР ГОВОРИТ ВСЛУХ. Если набралось меньше запрошенного, строка `shortfall` выводится
 * рядом с кнопкой: «удалил 100» не должно оказаться «удалил 63» без объяснения.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  BUFFER_CLEANUP_PRINCIPLES,
  BUFFER_CLEANUP_VOLUMES,
  type BufferCleanupExecuteOutcome,
  type BufferCleanupPlanOutcome,
  type BufferCleanupPrinciple,
  type MediaLibraryService,
} from '@membrana/media-library-service';

import { formatBytes } from '@/lib/formatBytes';

export interface BufferManagerPanelProps {
  readonly service: MediaLibraryService;
  /** Набор, которым управляем. Обычно буфер, но панель судит набор, а не его имя. */
  readonly collectionId: string;
  /** Занято/предел буфера — из квоты узла; показываем рядом, чтобы уборка была осмысленной. */
  readonly usedBytes?: number;
  readonly limitBytes?: number;
  readonly disabled?: boolean;
  /** Дом просит обновить список проб после уборки: панель не знает, как это делает страница. */
  readonly onCleaned?: () => void;
}

export function BufferManagerPanel({
  service,
  collectionId,
  usedBytes,
  limitBytes,
  disabled = false,
  onCleaned,
}: BufferManagerPanelProps) {
  const [principle, setPrinciple] = useState<BufferCleanupPrinciple>('oldest');
  const [volume, setVolume] = useState<number>(BUFFER_CLEANUP_VOLUMES[0]);
  const [plan, setPlan] = useState<BufferCleanupPlanOutcome | null>(null);
  const [done, setDone] = useState<BufferCleanupExecuteOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fill = useMemo(() => {
    if (!Number.isFinite(usedBytes) || !Number.isFinite(limitBytes) || !limitBytes) return null;
    return Math.round(((usedBytes as number) / (limitBytes as number)) * 100);
  }, [usedBytes, limitBytes]);

  const showPlan = useCallback(async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      setPlan(await service.planBufferCleanup(collectionId, { principle, volume }));
    } catch (e) {
      setPlan(null);
      setError(e instanceof Error ? e.message : 'План уборки не получен');
    } finally {
      setBusy(false);
    }
  }, [service, collectionId, principle, volume]);

  const confirm = useCallback(async () => {
    if (!plan || plan.doomed.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const outcome = await service.executeBufferCleanup(
        collectionId,
        plan.doomed.map((row) => row.id),
      );
      setDone(outcome);
      // План устарел в тот же миг: показывать список удалённого как «что уйдёт» нельзя.
      setPlan(null);
      onCleaned?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Уборка не выполнена');
    } finally {
      setBusy(false);
    }
  }, [service, collectionId, plan, onCleaned]);

  return (
    <div className="space-y-3 text-sm" role="region" aria-label="Управление буфером">
      <p className="text-base-content/70">
        Буфер:{' '}
        {Number.isFinite(usedBytes) && Number.isFinite(limitBytes)
          ? `${formatBytes(usedBytes as number)} из ${formatBytes(limitBytes as number)}${fill === null ? '' : ` (${fill}%)`}`
          : 'занятость неизвестна'}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-base-content/60">Принцип</span>
          <select
            className="select select-sm select-bordered"
            value={principle}
            disabled={disabled || busy}
            onChange={(e) => setPrinciple(e.target.value as BufferCleanupPrinciple)}
            aria-label="Принцип отбора"
          >
            {BUFFER_CLEANUP_PRINCIPLES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-base-content/60">Сколько</span>
          <select
            className="select select-sm select-bordered"
            value={volume}
            disabled={disabled || busy}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Объём уборки"
          >
            {BUFFER_CLEANUP_VOLUMES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn-sm"
          disabled={disabled || busy}
          onClick={() => void showPlan()}
        >
          Показать, что уйдёт
        </button>
      </div>

      {error ? (
        <p className="text-error" role="alert">
          {error}
        </p>
      ) : null}

      {plan ? (
        <div className="space-y-2">
          <p>
            Уйдёт {plan.doomed.length} из {plan.inBuffer}, освободится {formatBytes(plan.freedBytes)},
            останется {plan.remaining}.
          </p>
          {plan.shortfall ? (
            <p className="text-warning" role="status">
              {plan.shortfall}
            </p>
          ) : null}

          <div className="max-h-64 overflow-y-auto rounded border border-base-300/60">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Проба</th>
                  <th>Записана</th>
                  <th>Размер</th>
                </tr>
              </thead>
              <tbody>
                {plan.doomed.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td>{formatBytes(row.sizeBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {plan.protectedOut.length > 0 ? (
            <details className="rounded border border-base-300/60 p-2">
              <summary className="cursor-pointer">
                Не тронем: {plan.protectedOut.length}
              </summary>
              <ul className="mt-2 space-y-1">
                {plan.protectedOut.map((row) => (
                  <li key={row.id}>
                    <span className="font-medium">{row.title}</span> — {row.why}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {/*
            Кнопка удаления существует ТОЛЬКО когда список показан и в нём кто-то есть. Пустой
            план ведёт не к серой кнопке, а к её отсутствию: удалять нечего.
          */}
          {plan.doomed.length > 0 ? (
            <button
              type="button"
              className="btn btn-sm btn-error"
              disabled={disabled || busy}
              onClick={() => void confirm()}
            >
              Удалить эти {plan.doomed.length} — без возврата
            </button>
          ) : (
            <p role="status">Под этот выбор ничего не попало — удалять нечего.</p>
          )}
        </div>
      ) : null}

      {done ? (
        <div className="space-y-1" role="status">
          <p>
            Удалено {done.deleted}, освободилось {formatBytes(done.freedBytes)}.
          </p>
          {done.refused.length > 0 ? (
            <details>
              <summary className="cursor-pointer">Не удалено: {done.refused.length}</summary>
              <ul className="mt-1 space-y-1">
                {done.refused.map((r) => (
                  <li key={r.id}>{r.why}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
