/**
 * ОКНО ПОДТВЕРЖДЕНИЯ ПОНИЖЕНИЯ ТАРИФА (#2587 b5; ADR-0031 р.5 freeze-first).
 *
 * Человек видит по каждому узлу, сколько записей останется и сколько уйдёт в архив, и подтверждает
 * ОТДЕЛЬНОЙ кнопкой. Подтверждение несёт ровно те `planDigest`, что показаны (`confirmedDigests`):
 * пересчитать их здесь значило бы подтвердить план, которого человек не видел.
 *
 * Клавиатура (разбор Родченко): фокус при открытии — на «Отмена» (опасное действие не под Enter),
 * Escape — отмена, Tab/Shift+Tab ходят по кругу внутри окна, при закрытии фокус возвращается туда,
 * откуда окно открыли.
 */
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import type { DowngradePreviewPlan, SelectTariffOutcome } from '@/api/tariff';
import { formatBytes } from '@/lib/formatBytes';
import { tariffDenyText } from '@/lib/tariffDenyText';
import { CHART_LIST_CRITERIA } from '@/plugins/chart-list/chartList';

/** Хеши подтверждения: только узлы с избытком, ровно в том виде, в каком их показал предпросмотр. */
export function confirmedDigests(plan: DowngradePreviewPlan): Record<string, string> {
  return Object.fromEntries(plan.nodes.filter((n) => n.excess).map((n) => [n.nodeId, n.planDigest]));
}

/** Дата для людей (`7 октября 2026`). */
export function formatArchiveDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Отказ смены тарифа для окна: `stale` — план протух, нужен новый предпросмотр. */
export interface DowngradeRefusal {
  readonly text: string;
  readonly stale: boolean;
}

/** Отказ всегда начинается с «Тариф не изменён», причина — человеческим языком. */
export function downgradeRefusal(outcome: Extract<SelectTariffOutcome, { ok: false }>): DowngradeRefusal {
  if (outcome.reason === 'freeze_failed' && 'failures' in outcome) {
    return outcome.failures.some((f) => f.reason === 'plan_stale')
      ? { text: 'Тариф не изменён: данные на узле изменились — посмотрите предпросмотр заново', stale: true }
      : { text: 'Тариф не изменён: сервер записей не ответил', stale: false };
  }
  const text = tariffDenyText(outcome.reason);
  return { text: text.startsWith('Тариф не изменён') ? text : `Тариф не изменён: ${text}`, stale: false };
}

export interface DowngradeConfirmDialogProps {
  readonly plan: DowngradePreviewPlan;
  readonly toTariffName: string;
  /** `nodeId → подпись узла`; неизвестный узел показывается id. */
  readonly nodeLabels: Readonly<Record<string, string>>;
  readonly busy: boolean;
  /** Отказ последней попытки — показывается в окне, тариф при этом не менялся. */
  readonly refusal: DowngradeRefusal | null;
  readonly onCancel: () => void;
  readonly onConfirm: (digests: Record<string, string>) => void;
  /** Смена режима отбора: родитель сохраняет режим и запрашивает предпросмотр заново. */
  readonly onCriterionChange: (criterion: string) => void;
  /** Заново запросить предпросмотр (после `plan_stale`). */
  readonly onRefresh: () => void;
}

const FOCUSABLE = 'button:not([disabled]), select:not([disabled]), [href], input:not([disabled])';

/** Модальное окно подтверждения понижения с числами по узлам. */
export function DowngradeConfirmDialog(props: DowngradeConfirmDialogProps) {
  const { plan, toTariffName, nodeLabels, busy, refusal, onCancel, onConfirm, onCriterionChange, onRefresh } = props;
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!busy) onCancel();
      return;
    }
    if (e.key !== 'Tab' || !boxRef.current) return;
    const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const excess = plan.nodes.filter((n) => n.excess);
  const sum = (pick: (n: (typeof excess)[number]) => number) => excess.reduce((acc, n) => acc + pick(n), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="downgrade-confirm-title"
        aria-describedby="downgrade-confirm-desc"
        aria-busy={busy}
        onKeyDown={onKeyDown}
        className="flex max-h-full w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-lg bg-base-100 p-5 shadow-xl"
      >
        <h3 id="downgrade-confirm-title" className="text-lg font-semibold">
          Перейти на «{toTariffName}»?
        </h3>
        <p id="downgrade-confirm-desc" className="text-sm">
          На {excess.length} узл. останется {sum((n) => n.keepCount)} · уйдёт в архив{' '}
          {sum((n) => n.freezeCount)} записей · ≈{formatBytes(sum((n) => n.freezeBytes))}. Записи не удаляются
          сейчас: архив хранится {plan.retentionDays} дн., примерно до {formatArchiveDate(plan.expiresAtEstimate)}.
        </p>
        <label className="form-control" htmlFor="downgrade-confirm-criterion">
          <span className="label-text text-xs">Что оставить</span>
          <select
            id="downgrade-confirm-criterion"
            className="select select-bordered select-sm"
            value={plan.criterion}
            disabled={busy}
            onChange={(e) => onCriterionChange(e.target.value)}
          >
            {CHART_LIST_CRITERIA.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <ul className={`space-y-2 ${busy ? 'opacity-60' : ''}`} aria-label="По узлам" aria-busy={busy}>
          {excess.map((n) => (
            <li key={n.nodeId} className="rounded-lg bg-base-200 px-3 py-2 text-sm">
              <p className="font-medium">{nodeLabels[n.nodeId] ?? n.nodeId}</p>
              <p>
                Останется {n.keepCount} записей · уйдёт в архив {n.freezeCount} · ≈{formatBytes(n.freezeBytes)}
              </p>
              {n.unmeasured > 0 && (
                <p className="text-xs opacity-70">
                  не измерено: {n.unmeasured} — тише порога над фоном; из них остаются более новые
                </p>
              )}
            </li>
          ))}
        </ul>
        {refusal && (
          <div className="alert alert-error py-2 text-sm" role="alert">
            <span>{refusal.text}</span>
            {refusal.stale && (
              <button type="button" className="btn btn-xs" onClick={onRefresh} disabled={busy}>
                Посмотреть заново
              </button>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button ref={cancelRef} type="button" className="btn btn-sm" onClick={onCancel} disabled={busy}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-warning btn-sm"
            onClick={() => onConfirm(confirmedDigests(plan))}
            disabled={busy}
          >
            {busy ? 'Переходим…' : 'Понизить тариф'}
          </button>
        </div>
      </div>
    </div>
  );
}
