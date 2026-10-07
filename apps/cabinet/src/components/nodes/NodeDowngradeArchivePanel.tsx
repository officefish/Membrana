/**
 * ПАНЕЛЬ АРХИВА ПОНИЖЕНИЯ УЗЛА (#2619; ADR-0031, решение владельца 05.10: разморозка — рукой
 * пользователя, целой партией, пока не истёк срок и только если помещается).
 *
 * Партии узла с датой удаления и кнопкой «Вернуть из архива». Успех — только после ответа сервера;
 * отказ — текстом причины, партия остаётся в архиве. После успеха кнопка исчезает вместе со
 * строкой, поэтому фокус переводится на сообщение — он не теряется в `<body>`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchArchiveBatches,
  restoreArchiveBatch,
  type ArchiveBatchItem,
  type ArchiveNodeView,
} from '@/api/downgradeArchive';
import { formatBytes } from '@/lib/formatBytes';

const REFUSAL_TEXT: Record<string, string> = {
  archive_expired: 'Срок хранения истёк — эти записи больше не вернуть',
  batch_not_frozen: 'Эта партия уже возвращена или удалена — обновите страницу',
  insufficient_quota: 'Не помещается в буфер текущего тарифа — освободите место или повысьте тариф',
  batch_not_found: 'Партия не найдена — обновите страницу',
  media_unavailable: 'Сервер записей не ответил — попробуйте позже',
};

/** Человеческий текст отказа возврата; неизвестная причина не молчит, а называется кодом. */
export function restoreRefusalText(reason: string): string {
  return REFUSAL_TEXT[reason] ?? `Неизвестная причина отказа: ${reason}`;
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Партии архива мембраны, загруженные один раз на страницу узлов; `reload` — после возврата. */
export function useDowngradeArchive(): { nodes: ArchiveNodeView[]; reload: () => Promise<void> } {
  const [nodes, setNodes] = useState<ArchiveNodeView[]>([]);
  const reload = useCallback(async () => {
    try {
      setNodes(await fetchArchiveBatches());
    } catch {
      // Архив — дополнение к странице узлов: его недоступность не валит страницу, панель молчит.
      setNodes([]);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { nodes, reload };
}

type Feedback = { kind: 'done' | 'refusal'; text: string };

/** Панель архива одного узла; без партий не рисуется. */
export function NodeDowngradeArchivePanel({
  view,
  onRestored,
}: {
  view: ArchiveNodeView | undefined;
  onRestored: () => Promise<void> | void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const restore = useCallback(
    async (batch: ArchiveBatchItem) => {
      if (busyId) return;
      setBusyId(batch.batchId);
      setFeedback(null);
      try {
        const outcome = await restoreArchiveBatch(batch.batchId);
        if (outcome.ok) {
          setFeedback({ kind: 'done', text: `Вернули в буфер записей: ${outcome.restored}` });
          await onRestored();
        } else {
          setFeedback({ kind: 'refusal', text: `Не возвращено: ${restoreRefusalText(outcome.reason)}` });
        }
      } catch (e) {
        setFeedback({ kind: 'refusal', text: `Не возвращено: ${e instanceof Error ? e.message : 'ошибка запроса'}` });
      } finally {
        setBusyId(null);
      }
    },
    [busyId, onRestored],
  );

  if (!view) return null;
  const headingId = `archive-${view.nodeId}-title`;

  if ('unavailable' in view) {
    return (
      <div className="alert alert-warning py-2 text-sm" role="status">
        <span>Архив узла сейчас недоступен — сервер записей не ответил</span>
      </div>
    );
  }
  const frozen = view.batches.filter((b) => b.state === 'frozen');
  if (frozen.length === 0 && !feedback) return null;

  return (
    <section className="rounded-lg bg-base-200 p-3" aria-labelledby={headingId}>
      <h4 id={headingId} className="text-sm font-medium">
        Архив после понижения тарифа
      </h4>
      <ul className="mt-2 space-y-2">
        {frozen.map((b) => (
          <li key={b.batchId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {b.sampleCount} записей · ≈{formatBytes(b.frozenBytes)} · в архиве с {day(b.frozenAt)} · удалится{' '}
              {day(b.expiresAt)}
            </span>
            <button
              type="button"
              className="btn btn-xs"
              disabled={busyId !== null}
              aria-busy={busyId === b.batchId}
              aria-label={`Вернуть из архива записи от ${day(b.frozenAt)}`}
              onClick={() => void restore(b)}
            >
              {busyId === b.batchId ? 'Возвращаем…' : 'Вернуть из архива'}
            </button>
          </li>
        ))}
      </ul>
      {feedback && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          className={`alert mt-2 py-2 text-sm ${feedback.kind === 'done' ? 'alert-success' : 'alert-error'}`}
          role={feedback.kind === 'done' ? 'status' : 'alert'}
        >
          <span>{feedback.text}</span>
        </div>
      )}
    </section>
  );
}
