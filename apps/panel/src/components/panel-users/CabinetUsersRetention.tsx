import { useCallback, useEffect, useState } from 'react';

import {
  CabinetUsersApiError,
  RETENTION_OPTIONS,
  applyRetentionResult,
  fetchCabinetUsers,
  formatCreatedAt,
  isRetentionOption,
  retentionOptionLabel,
  setCabinetRetention,
  withOptimisticRetention,
  type CabinetUserRow,
  type RetentionOption,
} from '@/lib/cabinetUsersApi';
import { fetchPurgeSchedule, type PurgeScheduleRow } from '@/lib/coldArchiveApi';

/**
 * #2588 b4: блок «Пользователи кабинета» в owner-разделе «Пользователи».
 *
 * Таблица — ответ кабинета через office как есть (логики списка на клиенте нет): login как
 * ярлык · тариф · срок холодного архива · «по умолчанию» · дата регистрации. Срок меняется
 * выпадающим списком ровно из пяти значений с подтверждением В СТРОКЕ: выбор → строка
 * показывает «сменить на N?» → подтверждение → PUT. Успех — строка из ответа кабинета;
 * 503 «связь не настроена» — баннер и список без правки; прочая ошибка — текст в строке,
 * значение откатывается. Смена действует на СЛЕДУЮЩИЕ заморозки (ADR-0031 п.4, снимок).
 *
 * #2632 g6d (Т5): строка пользователя с замороженной партией помечена «архив ждёт удаления» с датой
 * ближайшего удаления — по графику удалений office (`purge-schedule`, только чтение). Иных действий
 * нет. График не пришёл — таблица работает как раньше, под ней строка «пометки недоступны».
 */

export const NOT_CONFIGURED_BANNER = 'Связь с кабинетом не настроена — список пользователей кабинета и срок архива недоступны.';
export const RETENTION_HINT = 'Срок холодного архива при понижении тарифа, дней. 14 — по умолчанию, 1 — для проверок. Действует на следующие заморозки.';

/** Окно графика удалений: дверь отдаёт не больше 100 ближайших партий. */
export const ARCHIVE_SCHEDULE_LIMIT = 100;

/** Мембрана → ближайший срок удаления её замороженных партий (ISO). */
export function archiveMarksFrom(rows: readonly PurgeScheduleRow[]): Record<string, string> {
  const marks: Record<string, string> = {};
  for (const r of rows) {
    const current = marks[r.membraneId];
    if (current === undefined || Date.parse(r.expiresAt) < Date.parse(current)) marks[r.membraneId] = r.expiresAt;
  }
  return marks;
}

export interface PendingChange {
  membraneId: string;
  days: RetentionOption;
}

export interface CabinetUsersTableProps {
  rows: readonly CabinetUserRow[];
  pending: PendingChange | null;
  busyMembraneId: string | null;
  /** Ошибка последней смены по мембране — текст в строке. */
  rowErrors: Readonly<Record<string, string>>;
  disabled: boolean;
  /** g6d: мембрана → ближайший срок удаления архива (ISO); нет ключа — пометки нет. */
  archiveMarks?: Readonly<Record<string, string>>;
  onPick: (membraneId: string, days: RetentionOption) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Презентационная таблица — без эффектов, рендерится статически (зубы). */
export function CabinetUsersTable({ rows, pending, busyMembraneId, rowErrors, disabled, archiveMarks = {}, onPick, onConfirm, onCancel }: CabinetUsersTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-base-content/60">В кабинете пока нет пользователей.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm" aria-label="Пользователи кабинета">
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Тариф</th>
            <th>Срок архива, дней</th>
            <th>Зарегистрирован</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isPending = pending?.membraneId === r.membraneId;
            const busy = busyMembraneId === r.membraneId;
            const error = rowErrors[r.membraneId];
            const archiveDue = archiveMarks[r.membraneId];
            return (
              <tr key={r.membraneId} data-membrane-id={r.membraneId}>
                <td>
                  <div className="font-medium">{r.displayLabel}</div>
                  <div className="font-mono text-xs text-base-content/50">{r.membraneId.slice(0, 8)}…</div>
                  {archiveDue && (
                    <span className="badge badge-warning badge-sm mt-1" data-archive-mark title="Замороженный архив будет удалён по графику уборки после этой даты">
                      архив ждёт удаления: {formatCreatedAt(archiveDue)}
                    </span>
                  )}
                </td>
                <td className="text-sm">{r.tariffId}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="select select-bordered select-sm"
                      value={isPending ? pending.days : r.retentionDays}
                      disabled={disabled || busy}
                      aria-label={`Срок архива для ${r.displayLabel}`}
                      onChange={(e) => {
                        const days = Number(e.target.value);
                        if (isRetentionOption(days)) onPick(r.membraneId, days);
                      }}
                    >
                      {RETENTION_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {retentionOptionLabel(d)}
                        </option>
                      ))}
                    </select>
                    {r.isDefault && !isPending && (
                      <span className="badge badge-ghost badge-sm" title="Строки срока в кабинете нет — действует умолчание">
                        по умолчанию
                      </span>
                    )}
                    {busy && <span className="loading loading-spinner loading-xs" aria-label="Сохраняем" />}
                  </div>
                  {isPending && !busy && (
                    <div className="mt-1 flex items-center gap-2 text-xs" role="group" aria-label={`Подтверждение смены срока для ${r.displayLabel}`}>
                      <span>
                        Сменить {r.retentionDays} → {pending.days} дн.?
                      </span>
                      <button type="button" className="btn btn-primary btn-xs" onClick={onConfirm}>
                        Сменить
                      </button>
                      <button type="button" className="btn btn-ghost btn-xs" onClick={onCancel}>
                        Отмена
                      </button>
                    </div>
                  )}
                  {error && (
                    <p role="alert" className="mt-1 text-xs text-error">
                      {error}
                    </p>
                  )}
                </td>
                <td className="text-xs tabular-nums">{formatCreatedAt(r.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type LoadState = 'loading' | 'not-configured' | 'error' | 'ready';

export function CabinetUsersRetention() {
  const [state, setState] = useState<LoadState>('loading');
  const [errorText, setErrorText] = useState('');
  const [rows, setRows] = useState<CabinetUserRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [busyMembraneId, setBusyMembraneId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [archiveMarks, setArchiveMarks] = useState<Record<string, string>>({});
  const [archiveNote, setArchiveNote] = useState('');

  // g6d: график удалений — отдельно от списка; его отказ список не ломает.
  useEffect(() => {
    let cancelled = false;
    fetchPurgeSchedule(ARCHIVE_SCHEDULE_LIMIT)
      .then((schedule) => {
        if (cancelled) return;
        setArchiveMarks(archiveMarksFrom(schedule));
        setArchiveNote(schedule.length >= ARCHIVE_SCHEDULE_LIMIT ? `Пометки архива — по ${ARCHIVE_SCHEDULE_LIMIT} ближайшим удалениям.` : '');
      })
      .catch((e) => {
        if (!cancelled) setArchiveNote(`Пометки «архив ждёт удаления» недоступны: ${e instanceof Error ? e.message : 'график удалений не получен.'}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const failWith = useCallback((e: unknown) => {
    if (e instanceof CabinetUsersApiError && e.notConfigured) {
      setState('not-configured');
      return;
    }
    setErrorText(e instanceof Error ? e.message : 'Не удалось загрузить пользователей кабинета.');
    setState('error');
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCabinetUsers()
      .then((page) => {
        if (cancelled) return;
        setRows(page.items);
        setNextCursor(page.nextCursor);
        setState('ready');
      })
      .catch((e) => {
        if (!cancelled) failWith(e);
      });
    return () => {
      cancelled = true;
    };
  }, [failWith]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchCabinetUsers(nextCursor);
      setRows((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      failWith(e);
    } finally {
      setLoadingMore(false);
    }
  }

  function onPick(membraneId: string, days: RetentionOption) {
    const row = rows.find((r) => r.membraneId === membraneId);
    if (!row || row.retentionDays === days) {
      setPending(null);
      return;
    }
    setRowErrors((prev) => ({ ...prev, [membraneId]: '' }));
    setPending({ membraneId, days });
  }

  async function onConfirm() {
    if (!pending) return;
    const { membraneId, days } = pending;
    const prevRows = rows;
    setPending(null);
    setBusyMembraneId(membraneId);
    setRows(withOptimisticRetention(rows, membraneId, days));
    try {
      const result = await setCabinetRetention(membraneId, days);
      setRows((current) => applyRetentionResult(current, result));
    } catch (e) {
      setRows(prevRows);
      if (e instanceof CabinetUsersApiError && e.notConfigured) {
        setState('not-configured');
      } else {
        setRowErrors((prev) => ({ ...prev, [membraneId]: e instanceof Error ? e.message : 'Не получилось сменить срок.' }));
      }
    } finally {
      setBusyMembraneId(null);
    }
  }

  return (
    <section aria-label="Пользователи кабинета" className="space-y-2">
      <h3 className="text-sm font-semibold">Пользователи кабинета{state === 'ready' ? ` (${rows.length}${nextCursor ? '+' : ''})` : ''}</h3>
      <p className="text-xs text-base-content/60">{RETENTION_HINT}</p>
      {state === 'loading' && (
        <div className="flex justify-center py-6" aria-busy="true">
          <span className="loading loading-spinner loading-md text-primary" aria-label="Загрузка пользователей кабинета" />
        </div>
      )}
      {state === 'not-configured' && (
        <div className="alert alert-warning" role="alert" data-banner="cabinet-not-configured">
          <span>{NOT_CONFIGURED_BANNER}</span>
        </div>
      )}
      {state === 'error' && (
        <div className="alert alert-error" role="alert">
          <span>{errorText}</span>
        </div>
      )}
      {state === 'ready' && (
        <>
          <CabinetUsersTable
            rows={rows}
            pending={pending}
            busyMembraneId={busyMembraneId}
            rowErrors={rowErrors}
            disabled={false}
            archiveMarks={archiveMarks}
            onPick={onPick}
            onConfirm={() => void onConfirm()}
            onCancel={() => setPending(null)}
          />
          {archiveNote && (
            <p className="text-xs text-base-content/60" role="status" data-archive-note>
              {archiveNote}
            </p>
          )}
          {nextCursor && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? <span className="loading loading-spinner loading-xs" /> : 'Показать ещё'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
