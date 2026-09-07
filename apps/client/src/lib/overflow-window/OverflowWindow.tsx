import { useEffect, useId, useRef, type ReactNode } from 'react';

import type { QuotaSubject } from '@membrana/plugin-contracts';

import type { StartAttempt } from '@/lib/device-overflow-hold';

import {
  describeCleanOutcome,
  describeSinceStop,
  type BufferLedgerSnapshot,
  type CleanOutcome,
  type SinceStopDelta,
} from './ledger';
import {
  NOT_AVAILABLE_TEXT,
  OVERFLOW_ALIVE_TEXT,
  OVERFLOW_AXIS_TITLE,
  formatBytes,
  formatOverflowAt,
} from './reasonTexts';
import type { OverflowAxisView, OverflowWindowViewModel } from './viewModel';

export interface OverflowWindowProps {
  readonly open: boolean;
  readonly vm: OverflowWindowViewModel;
  readonly refusedAttempt: StartAttempt | null;
  /** Счёт буфера при первом показе окна (локальный снимок); `null` — снимка нет. */
  readonly bufferAtStop: BufferLedgerSnapshot | null;
  /** Что ушло из буфера с момента остановки (локальный снимок); `null` — снимка ещё нет. */
  readonly sinceStop: SinceStopDelta | null;
  /** Факт чистки из этого окна; `null` — чистки не было. */
  readonly outcome: CleanOutcome | null;
  /** Сколько уйдёт по «Почистить» — счёт из локального снимка буфера. */
  readonly cleanPromise: { readonly samples: number; readonly bytes: number } | null;
  readonly busy: boolean;
  /** Поверх окна открыт вложенный диалог — окно не ловит клавиши и не держит фокус. */
  readonly suspended?: boolean;
  /** Закрыть: Esc / крестик. Удержание остаётся. */
  readonly onClose: () => void;
  /** Дорога 1 — вывоз в набор: существующий вывоз библиотеки (#2226), вещдок не стирается. */
  readonly onExportToCollection: () => void;
  /** Дорога 2 — почистить: ТОЛЬКО через подтверждение со счётом (обработчик открывает его). */
  readonly onCleanRequest: () => void;
  /** Дорога 3 — сменить тариф: кабинет, страница мембраны (#2286). */
  readonly onChangeTariff: () => void;
  /** Единственный ручной выход из удержания — явное действие, не закрытие. */
  readonly onResumeByHuman: () => void;
}

const AXES: readonly QuotaSubject[] = ['buffer', 'userStorage'];

function AxisMeter({ subject, axis }: { readonly subject: QuotaSubject; readonly axis: OverflowAxisView | null }) {
  const title = OVERFLOW_AXIS_TITLE[subject];
  if (axis === null) {
    return (
      <div className="flex flex-col gap-1" data-testid={`overflow-axis-${subject}`}>
        <div className="flex justify-between text-xs">
          <span>{title}</span>
          <span className="opacity-70">{NOT_AVAILABLE_TEXT}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1" data-testid={`overflow-axis-${subject}`}>
      <div className="flex justify-between text-xs">
        <span>{title}</span>
        <span className="tabular-nums">
          занято {formatBytes(axis.usedBytes)} / лимит {formatBytes(axis.limitBytes)} / свободно{' '}
          {formatBytes(axis.freeBytes)}
        </span>
      </div>
      <progress
        className={`progress w-full ${axis.freeBytes === 0 ? 'progress-error' : 'progress-warning'}`}
        value={axis.percent}
        max={100}
        aria-label={`${title}: занято ${axis.percent}%`}
      />
    </div>
  );
}

/**
 * Окно оператора «буфер полон» (M5, #2310) — ЕДИНСТВЕННЫЙ презентационный носитель модалки.
 * Два входа (панель микрофона, доска устройства) поднимают ЭТО окно через контроллер;
 * копия модалки — запрет (структурный зуб). Вёрстка без бизнес-логики: счёт, удержание и
 * дороги приходят снаружи (Верстальщик, M5).
 */
export function OverflowWindow({
  open,
  vm,
  refusedAttempt,
  bufferAtStop,
  sinceStop,
  outcome,
  cleanPromise,
  busy,
  suspended = false,
  onClose,
  onExportToCollection,
  onCleanRequest,
  onChangeTariff,
  onResumeByHuman,
}: OverflowWindowProps): ReactNode {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusTo = useRef<Element | null>(null);
  const titleId = useId();
  const descId = useId();

  /**
   * Клавиатура и фокус: Esc закрывает (удержание остаётся), Tab не выпускает наружу,
   * по закрытии фокус возвращается. Пока поверх открыт диалог подтверждения — ловушка спит,
   * иначе два окна дерутся за Tab.
   */
  useEffect(() => {
    if (!open || suspended) return undefined;
    returnFocusTo.current = document.activeElement;
    const node = dialogRef.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!busy) onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !node?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (returnFocusTo.current instanceof HTMLElement) returnFocusTo.current.focus();
    };
  }, [open, suspended, busy, onClose]);

  if (!open) return null;

  const cleanLabel =
    cleanPromise === null
      ? 'Почистить…'
      : `Почистить… (уйдёт ${cleanPromise.samples} проб · ${formatBytes(cleanPromise.bytes)})`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      data-testid="overflow-window"
      data-overflow-key={vm.windowKey}
      aria-hidden={suspended ? true : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 overflow-auto rounded-lg bg-base-100 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-semibold">
              {vm.title}
            </h3>
            <p id={descId} className="text-sm" data-testid="overflow-reason">
              {vm.reason.text}
              {vm.reason.rawCode !== null ? (
                <span className="ml-2 font-mono text-xs opacity-50" data-testid="overflow-reason-raw">
                  {vm.reason.rawCode}
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Закрыть окно — удержание останется"
            title="Закрыть окно. Прибор останется остановленным, пока вы не разберётесь с буфером."
            onClick={onClose}
            disabled={busy}
          >
            ✕
          </button>
        </div>

        {!vm.held ? (
          <p className="alert alert-success py-2 text-sm" role="status" data-testid="overflow-released">
            Удержание снято — запись снова возможна.
          </p>
        ) : (
          <p className="alert alert-error py-2 text-sm" role="status" data-testid="overflow-held">
            Прибор {OVERFLOW_ALIVE_TEXT}: новые пробы не отправляются, связь и наблюдение живут. Само не
            возобновится.
          </p>
        )}

        {refusedAttempt !== null ? (
          <p className="text-sm text-warning" data-testid="overflow-refused-attempt">
            Отбит старт: {refusedAttempt.what} ({refusedAttempt.source === 'mic' ? 'микрофон' : 'доска'}) — тот же
            факт переполнения.
          </p>
        ) : null}

        <div className="flex flex-col gap-3 rounded border border-base-300 p-3" data-testid="overflow-axes">
          {AXES.map((subject) => (
            <AxisMeter key={subject} subject={subject} axis={vm.axes[subject]} />
          ))}
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="opacity-70">Время факта</dt>
          <dd className="tabular-nums" data-testid="overflow-at">
            {formatOverflowAt(vm.overflowAt)}
          </dd>
          <dt className="opacity-70">Режим прибора</dt>
          <dd data-testid="overflow-mode">
            <span className="badge badge-outline badge-sm mr-2">{vm.policyText}</span>
            {vm.phaseText}
          </dd>
          <dt className="opacity-70">Записано до остановки</dt>
          <dd data-testid="overflow-recorded">{vm.recordedBeforeStopText}</dd>
          <dt className="opacity-70">В буфере при остановке</dt>
          <dd data-testid="overflow-buffer-at-stop">
            {bufferAtStop === null
              ? NOT_AVAILABLE_TEXT
              : `${bufferAtStop.bufferSamples} проб · ${formatBytes(bufferAtStop.bufferBytes)}`}
          </dd>
        </dl>

        {sinceStop !== null ? (
          <p className="text-sm" data-testid="overflow-since-stop">
            {describeSinceStop(sinceStop)}
          </p>
        ) : null}

        {outcome !== null ? (
          <p
            className={`alert py-2 text-sm ${outcome.mismatch ? 'alert-warning' : 'alert-info'}`}
            role="status"
            data-testid="overflow-outcome"
          >
            {describeCleanOutcome(outcome)}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 pt-1" data-testid="overflow-roads">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              data-testid="overflow-road-export"
              onClick={onExportToCollection}
              disabled={busy}
              title="Перенести пробы из буфера в набор — ничего не стирается"
            >
              Вывезти в набор
            </button>
            <button
              type="button"
              className="btn btn-outline btn-error btn-sm"
              data-testid="overflow-road-clean"
              onClick={onCleanRequest}
              disabled={busy}
              title="Удалить пробы из буфера — только после подтверждения со счётом"
            >
              {cleanLabel}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              data-testid="overflow-road-tariff"
              onClick={onChangeTariff}
              disabled={busy || !vm.tariff.enabled}
              title={vm.tariff.note}
            >
              Сменить тариф
            </button>
          </div>
          <p className="text-xs opacity-70" data-testid="overflow-tariff-note">
            {vm.tariff.note}
          </p>
        </div>

        {vm.held ? (
          <div className="flex items-center justify-between gap-2 border-t border-base-300 pt-3">
            <span className="text-xs opacity-70">
              Закрытие окна удержание не снимает. Снять — только явно, когда место освобождено.
            </span>
            <button
              type="button"
              className="btn btn-sm"
              data-testid="overflow-resume"
              onClick={onResumeByHuman}
              disabled={busy}
            >
              Возобновить запись
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
