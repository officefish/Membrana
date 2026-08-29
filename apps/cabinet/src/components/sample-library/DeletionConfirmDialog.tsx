/**
 * Окно подтверждения необратимого удаления (#2218, заказ владельца 29.08).
 *
 * ЗАЧЕМ ОКНО, А НЕ `window.confirm`. Системный confirm умеет один вопрос и ноль фактов: он
 * спрашивает «уверены?», не показывая ни списка, ни того, чем эти записи могут оказаться.
 * 28.08 в буфере лежало 1747 проб, из них 1692 — вещдоки двух документированных окон, и
 * защищена была одна. Кнопка «очистить буфер» на системном confirm стёрла бы ночь дежурства
 * из закрытого разбора, спросив ровно «уверены?».
 *
 * ЧТО ЗДЕСЬ ЕСТЬ. Список того, что уйдёт, и гипотеза ценности на каждую запись — из ядра
 * `assessDeletion`, одного на оба дома. Дом ничего не судит сам: он рисует вердикты ядра.
 *
 * БЛИЗНЕЦ. Тот же файл по смыслу живёт в Studio
 * (`apps/client/src/components/DeletionConfirmDialog.tsx`). Общего UI-пакета у домов нет,
 * поэтому правило одно, а носителя два; расхождение ловит зуб сходства
 * `apps/client/src/modules/deletion-dialog-twins.test.ts`, а не внимательность.
 */
import { useEffect, useMemo, useReducer, type ReactNode } from 'react';

import {
  DELETION_GATE_CLOSED,
  assessDeletion,
  deletionGateReducer,
  isDeletionBlocked,
  type Collection,
  type DeletionValueLevel,
  type MediaSample,
} from '@membrana/media-library-service';

export interface DeletionConfirmDialogProps {
  readonly open: boolean;
  /** Что именно уйдёт. Пустой список — окно откажется удалять. */
  readonly samples: readonly MediaSample[];
  readonly collections?: readonly Collection[];
  /**
   * Сколько записей уйдёт НА САМОМ ДЕЛЕ, если известно больше, чем загружено в `samples`.
   * Очистка буфера удаляет весь набор, а в руках дома лежит одна страница — показать
   * число страницы значило бы ЗАНИЗИТЬ потерю, то есть соврать в успокаивающую сторону.
   */
  readonly declaredTotal?: number;
  readonly deviceId?: string;
  /** Заголовок действия: «Очистить буфер», «Удалить пробу» — глагол человека, не наш. */
  readonly title: string;
  readonly busy?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

const LEVEL_TITLE: Record<DeletionValueLevel, string> = {
  evidence: 'вещдок',
  curated: 'разобрано руками',
  ordinary: 'рядовая',
};

const LEVEL_CLASS: Record<DeletionValueLevel, string> = {
  evidence: 'badge badge-error badge-sm',
  curated: 'badge badge-warning badge-sm',
  ordinary: 'badge badge-ghost badge-sm',
};

/** Сколько строк показываем без прокрутки — остальное считаем числом, а не прячем. */
const VISIBLE_ROWS = 40;

export function DeletionConfirmDialog({
  open,
  samples,
  collections,
  declaredTotal,
  deviceId,
  title,
  busy = false,
  onCancel,
  onConfirm,
}: DeletionConfirmDialogProps): ReactNode {
  const summary = useMemo(
    () => assessDeletion(samples, { collections, deviceId }),
    [samples, collections, deviceId],
  );
  /**
   * Состояние ворот живёт в ЯДРЕ (`deletionGateReducer`), а не в этом компоненте: правило
   * «любое открытие обнуляет второе движение» — общее для обоих домов, и проверяется оно
   * последовательностью событий в зубе, а не рендером.
   */
  const [gate, dispatch] = useReducer(deletionGateReducer, DELETION_GATE_CLOSED);
  const acknowledged = gate.acknowledged;

  // Открытие объявляется воротам своим ключом: своё удаление — свой ключ, и второе
  // движение начинается заново. Ключ несёт и заголовок, и состав списка: смена любого из
  // них — другое удаление, а не то же самое.
  const openKey = `${title}|${samples.map((s) => s.id).join(',')}`;
  useEffect(() => {
    dispatch(open ? { type: 'open', key: openKey } : { type: 'close' });
  }, [open, openKey]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const known = summary.total;
  const willDelete = typeof declaredTotal === 'number' ? declaredTotal : known;
  const unknown = Math.max(0, willDelete - known);
  const nothingToDelete = willDelete === 0;
  const valuable = summary.evidence + summary.curated;
  const blocked = isDeletionBlocked({
    willDelete,
    evidence: summary.evidence,
    acknowledged,
    busy,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-3 rounded-lg bg-base-100 p-5 shadow-xl"
      >
        <h3 className="text-lg font-semibold">{title}</h3>

        <p className="text-sm">{summary.headline}</p>
        {unknown > 0 ? (
          <p className="text-sm text-warning">
            Разобрано по ценности {known} из {willDelete}: остальные ещё не загружены в этот дом,
            и об их ценности сказать нечего. Уйдут все {willDelete}.
          </p>
        ) : null}
        {summary.evidence > 0 ? (
          <p className="text-sm text-error">
            Среди них {summary.evidence} записей, на которые ссылаются приёмочные документы.
            После удаления документ перестанет разрешать свои ссылки.
          </p>
        ) : null}

        {nothingToDelete ? (
          <p className="text-sm opacity-70">Удалять нечего — список пуст.</p>
        ) : (
          <div className="overflow-auto rounded border border-base-300">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Запись</th>
                  <th>Когда</th>
                  <th>Ценность</th>
                  <th>Почему</th>
                </tr>
              </thead>
              <tbody>
                {summary.verdicts.slice(0, VISIBLE_ROWS).map((v) => (
                  <tr key={v.id}>
                    <td className="font-mono text-xs">{v.title}</td>
                    <td className="whitespace-nowrap text-xs opacity-70">
                      {v.createdAt.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td>
                      <span className={LEVEL_CLASS[v.level]}>{LEVEL_TITLE[v.level]}</span>
                    </td>
                    <td className="text-xs">{v.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.total > VISIBLE_ROWS ? (
              <p className="p-2 text-xs opacity-70">
                Показаны первые {VISIBLE_ROWS} из {summary.total}; ценные подняты наверх.
              </p>
            ) : null}
          </div>
        )}

        {summary.evidence > 0 ? (
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={acknowledged}
              onChange={(e) => dispatch({ type: 'acknowledge', value: e.target.checked })}
            />
            <span>Понимаю, что удаляю вещдоки, и делаю это осознанно</span>
          </label>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs opacity-70">
            {valuable > 0 ? `ценных в списке: ${valuable}` : 'ценных в списке нет'}
          </span>
          <span className="flex gap-2">
            <button type="button" className="btn btn-sm" onClick={onCancel} disabled={busy}>
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-error btn-sm"
              onClick={onConfirm}
              disabled={blocked}
            >
              {busy ? 'Удаление…' : `Удалить ${willDelete}`}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
