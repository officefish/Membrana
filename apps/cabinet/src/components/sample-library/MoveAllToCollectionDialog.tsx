/**
 * Окно «перенести все» — выбор набора, план, подтверждение (заказ владельца 27.09).
 *
 * ЗАЧЕМ ОКНО, А НЕ ПРОСТО КНОПКА. Перенос пачкой упирается в место: хранилище наборов
 * мембраны — такая же ось квоты, как буфер, и на тарифе «Датчик» такая же по объёму.
 * Значит «перенести все» из полного буфера в общем случае НЕ помещается целиком, и человек
 * обязан узнать это ДО, а не по факту. Поэтому шаг плана (`dryRun`) обязателен: дверь
 * считает, сколько поместится, окно называет живые числа, и только потом — слово человека.
 *
 * ВОРОТА МЯГЧЕ, ЧЕМ У УДАЛЕНИЯ, И ЭТО НАМЕРЕННО. Перенос обратим: проба цела, у неё
 * меняется набор. Пугать его окном вещдоков (`DeletionConfirmDialog`, галочка «понимаю,
 * что удаляю») значило бы уравнять обратимое с необратимым — а от предупреждения, которое
 * пугает всем одинаково, перестают читать все предупреждения.
 *
 * СЛОВА И ЧИСЛА — ИЗ ЯДРА (`move-batch.ts`), одного на оба дома. Здесь вёрстка, клавиши и
 * фокус; ни одной своей формулировки о плане, ни одного своего суждения о месте.
 *
 * БЛИЗНЕЦ. Тот же файл по смыслу живёт в Studio
 * (`apps/client/src/components/MoveAllToCollectionDialog.tsx`). Общего UI-пакета у домов
 * нет, поэтому правило одно, а носителя два; расхождение ловит зуб сходства
 * `apps/client/src/modules/move-all-dialog-twins.test.ts`, а не внимательность.
 */
import { useCallback, useEffect, useId, useReducer, useRef, type ReactNode } from 'react';

import {
  MOVE_BATCH_START,
  describeMoveBatchOutcome,
  describeMoveBatchPlan,
  formatMoveBatchBytes,
  moveBatchReducer,
  moveBatchTargets,
  pluralSamples,
  type Collection,
  type MoveBatchPort,
  type MoveBatchSource,
} from '@membrana/media-library-service';

export interface MoveAllToCollectionDialogProps {
  readonly open: boolean;
  /** Откуда едут пробы: имя для слов и признак буфера — у буфера свои слова об остатке. */
  readonly source: MoveBatchSource;
  /**
   * Сколько проб в наборе по счётчику НАБОРА, а не по загруженной странице. Число стоит в
   * окне до плана; страница кабинета держит 40 из 1057, и показать её было бы занижением.
   */
  readonly sourceTotal: number;
  /** Все наборы узла. Кого из них можно выбрать — решает ядро, а не дом. */
  readonly collections: readonly Collection[];
  readonly sourceCollectionId: string;
  readonly port: MoveBatchPort;
  readonly onClose: () => void;
  /** Перенос состоялся — дому пора перечитать свою страницу проб. */
  readonly onMoved?: () => void;
}

export function MoveAllToCollectionDialog({
  open,
  source,
  sourceTotal,
  collections,
  sourceCollectionId,
  port,
  onClose,
  onMoved,
}: MoveAllToCollectionDialogProps): ReactNode {
  const [state, dispatch] = useReducer(moveBatchReducer, MOVE_BATCH_START);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusTo = useRef<Element | null>(null);
  const titleId = useId();
  const descId = useId();
  /**
   * Поколение открытия. Ответ двери, приехавший после закрытия окна, в ЭТО окно не попадёт:
   * иначе человек, открывший перенос второй раз, увидел бы план первого — и подтвердил бы
   * числа, которых уже нет.
   */
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    dispatch({ type: 'close' });
  }, [open]);

  const phase = state.phase;
  const busy = phase.kind === 'planning' || phase.kind === 'moving';

  /** Клавиатура и фокус: Esc закрывает (пока не идёт работа), Tab не выпускает, фокус возвращается. */
  useEffect(() => {
    if (!open) return undefined;
    returnFocusTo.current = document.activeElement;
    const node = dialogRef.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
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
  }, [open, busy, onClose]);

  const targets = moveBatchTargets(collections, sourceCollectionId);

  const askPlan = useCallback(async () => {
    const mine = generation.current;
    dispatch({ type: 'plan-start' });
    try {
      const sampleIds = await port.enumerate();
      if (sampleIds.length === 0) {
        if (generation.current === mine) {
          dispatch({ type: 'failed', why: 'В наборе нет проб — переносить нечего.' });
        }
        return;
      }
      const outcome = await port.run({
        sampleIds,
        toCollectionId: state.toCollectionId,
        dryRun: true,
      });
      if (generation.current === mine) dispatch({ type: 'plan-done', sampleIds, outcome });
    } catch (e) {
      if (generation.current === mine) {
        dispatch({ type: 'failed', why: e instanceof Error ? e.message : String(e) });
      }
    }
  }, [port, state.toCollectionId]);

  const runMove = useCallback(
    async (sampleIds: readonly string[], toCollectionId: string) => {
      const mine = generation.current;
      dispatch({ type: 'move-start' });
      try {
        // Переносим РОВНО тот список, по которому считался показанный план: пересчитать
        // перечень здесь значило бы подтвердить одно, а сделать другое.
        const outcome = await port.run({ sampleIds, toCollectionId, dryRun: false });
        if (generation.current === mine) dispatch({ type: 'move-done', outcome });
        onMoved?.();
      } catch (e) {
        if (generation.current === mine) {
          dispatch({ type: 'failed', why: e instanceof Error ? e.message : String(e) });
        }
      }
    },
    [onMoved, port],
  );

  if (!open) return null;

  const targetName = targets.find((c) => c.id === state.toCollectionId)?.name ?? '';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" data-testid="move-all-window">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="flex max-h-[85vh] w-full max-w-xl flex-col gap-3 overflow-auto rounded-lg bg-base-100 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-semibold">
              Перенести все в набор
            </h3>
            <p id={descId} className="text-sm text-base-content/70">
              Источник — {source.isBuffer ? 'буфер' : `набор «${source.name}»`}: {pluralSamples(sourceTotal)}. Пробы
              не удаляются, у них меняется набор.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Закрыть окно переноса"
            onClick={onClose}
            disabled={busy}
          >
            ✕
          </button>
        </div>

        {targets.length === 0 ? (
          <p className="alert alert-info py-2 text-sm" role="status" data-testid="move-all-no-targets">
            Переносить некуда: своих наборов ещё нет. Создайте набор — буфер адресатом не бывает.
          </p>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-base-content/70">Набор, в который переносим</span>
            <select
              className="select select-bordered select-sm"
              value={state.toCollectionId}
              disabled={busy}
              data-testid="move-all-target"
              onChange={(e) => dispatch({ type: 'choose', toCollectionId: e.target.value })}
            >
              <option value="" disabled>
                Выберите набор…
              </option>
              {targets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {phase.kind === 'planning' ? (
          <p className="text-sm" role="status" data-testid="move-all-planning">
            Считаем, сколько поместится…
          </p>
        ) : null}

        {phase.kind === 'planned'
          ? (() => {
              const words = describeMoveBatchPlan({
                plan: phase.outcome.plan,
                requested: phase.sampleIds.length,
                source,
                userStorage: phase.outcome.userStorage,
              });
              return (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium tabular-nums" data-testid="move-all-plan">
                    {words.headline}
                  </p>
                  {/*
                    ПЛАШКА НЕХВАТКИ МЕСТА — только при `willStay > 0` (ядро отдаёт `null`, когда
                    помещается всё). Предупреждение «на всякий случай» перестают читать целиком.

                    Классы: сплошная семантическая поверхность `alert alert-warning`. Своего цвета
                    текста здесь НЕ ставим: `-content` подобран под сплошную заливку, и на
                    полупрозрачной (`bg-warning/10`) он пропадает в четырёх тёмных темах из пяти —
                    зуб `apps/client/src/lib/semanticSurfaceContrast.test.ts`, случай #2461.
                  */}
                  {words.warning !== null ? (
                    <p className="alert alert-warning py-2 text-sm" role="status" data-testid="move-all-warning">
                      {words.warning}
                    </p>
                  ) : null}
                  {words.requestedMismatch !== null ? (
                    <p className="text-xs text-error" role="alert" data-testid="move-all-plan-mismatch">
                      {words.requestedMismatch}
                    </p>
                  ) : null}
                  <p className="text-xs text-base-content/60 tabular-nums">
                    Хранилище наборов: занято {formatMoveBatchBytes(phase.outcome.userStorage.usedBytes)} из{' '}
                    {formatMoveBatchBytes(phase.outcome.userStorage.limitBytes)} · буфер:{' '}
                    {formatMoveBatchBytes(phase.outcome.buffer.usedBytes)} из{' '}
                    {formatMoveBatchBytes(phase.outcome.buffer.limitBytes)}
                  </p>
                </div>
              );
            })()
          : null}

        {phase.kind === 'moving' ? (
          <p className="text-sm" role="status" data-testid="move-all-moving">
            Переносим в «{targetName}»…
          </p>
        ) : null}

        {phase.kind === 'done'
          ? (() => {
              const words = describeMoveBatchOutcome({
                outcome: phase.outcome,
                requested: phase.requested,
                source,
              });
              return (
                <div className="flex flex-col gap-2">
                  <p className="alert alert-success py-2 text-sm tabular-nums" role="status" data-testid="move-all-result">
                    {words.headline}
                  </p>
                  {words.stayed !== null ? (
                    <p className="text-sm" data-testid="move-all-result-stayed">
                      {words.stayed}
                    </p>
                  ) : null}
                  {/* Факт разошёлся с планом — говорим оба числа, а не показываем план как итог. */}
                  {words.planMismatch !== null ? (
                    <p className="alert alert-warning py-2 text-sm" role="alert" data-testid="move-all-result-mismatch">
                      {words.planMismatch}
                    </p>
                  ) : null}
                </div>
              );
            })()
          : null}

        {phase.kind === 'failed' ? (
          <p className="alert alert-error py-2 text-sm" role="alert" data-testid="move-all-failed">
            {phase.why}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {phase.kind === 'done' ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>
              Закрыть
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} disabled={busy}>
                Отмена
              </button>
              {phase.kind === 'planned' ? (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  data-testid="move-all-confirm"
                  onClick={() => void runMove(phase.sampleIds, phase.toCollectionId)}
                >
                  Перенести {phase.outcome.plan.willMove} в «{targetName}»
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  data-testid="move-all-plan-request"
                  disabled={busy || !state.toCollectionId}
                  onClick={() => void askPlan()}
                >
                  Показать, сколько поместится
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
