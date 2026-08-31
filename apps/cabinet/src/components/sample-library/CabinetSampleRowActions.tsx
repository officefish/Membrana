/**
 * Действия над пробой — ОДНИ на строку списка и строку выборки (#2188, требование 2).
 *
 * ЗАЧЕМ ОБЩИЙ КОМПОНЕНТ. Выборка есть ВИД на те же пробы, а не отдельная витрина: разбор
 * ночного улова идёт из неё, и раскладывать по наборам нужно прямо оттуда, не возвращаясь
 * искать пробу среди 1727 строк. Если бы органы нарисовались в панели заново, они разъехались
 * бы со списком молча — класс уже ловили на плеере в #2184, второй раз ловить незачем.
 *
 * ГЛАГОЛЫ ЗДЕСЬ НЕ ЖИВУТ. Перенос, скачивание и удаление держит сервис библиотеки, а страница
 * подаёт их пропами. Компонент рисует органы и зовёт поданное — своей правды о наборе у него
 * нет и быть не должно.
 *
 * УДАЛЕНИЕ — ТОЛЬКО С ПОДТВЕРЖДЕНИЕМ, и вопрос называет пробу: «удалить эту» без имени человек
 * подтверждает не глядя.
 */
import type { Collection } from '@membrana/media-library-service';

export interface CabinetSampleRowActionsProps {
  readonly sampleId: string;
  readonly title: string;
  readonly disabled?: boolean;
  /** Наборы-получатели переноса. Пусто — органа переноса нет: некуда. */
  readonly moveTargets?: readonly Collection[];
  readonly canMutate?: boolean;
  readonly onMove?: (sampleId: string, toId: string) => void;
  readonly onExport?: (sampleId: string) => void;
  readonly onRemove?: (sampleId: string) => void;
}

export function CabinetSampleRowActions({
  sampleId,
  title,
  disabled = false,
  moveTargets = [],
  canMutate = false,
  onMove,
  onExport,
  onRemove,
}: CabinetSampleRowActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {onExport ? (
        <button
          type="button"
          className="btn btn-xs btn-ghost"
          disabled={disabled}
          aria-label={`Скачать ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            onExport(sampleId);
          }}
        >
          ↓
        </button>
      ) : null}

      {canMutate && onMove && moveTargets.length > 0 ? (
        <select
          className="select select-bordered select-xs max-w-[8rem]"
          defaultValue=""
          disabled={disabled}
          aria-label={`Перенести ${title} в набор`}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const toId = e.target.value;
            // Значение сбрасывается сразу: выпадающий здесь — команда, а не состояние строки.
            e.target.value = '';
            if (toId) onMove(sampleId, toId);
          }}
        >
          <option value="" disabled>
            Перенести…
          </option>
          {moveTargets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : null}

      {canMutate && onRemove ? (
        <button
          type="button"
          className="btn btn-xs btn-ghost text-error"
          disabled={disabled}
          aria-label={`Удалить ${title}`}
          onClick={(e) => {
            e.stopPropagation();
            // Вопрос задаёт ОКНО удаления (#2218): оно показывает список и гипотезу
            // ценности. Системный confirm умеет только «уверены?» — второй, более слабый
            // вопрос поверх сильного лишь приучает жать «да».
            onRemove(sampleId);
          }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
