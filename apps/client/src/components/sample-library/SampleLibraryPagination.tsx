import { useEffect, useRef, type RefObject } from 'react';

/**
 * ОРГАНЫ ЛИСТАНИЯ списка проб в Studio (#2505) — близнец кабинетного
 * `CabinetSampleTablePagination`.
 *
 * Слова, разметка и aria-подписи взяты у кабинета НАМЕРЕННО: два дома одной библиотеки не должны
 * говорить о страницах по-разному. Общего носителя у них сегодня нет (React-разметка у каждого
 * приложения своя, нового пакета под один `nav` не заводят — см. отчёт по #2497), поэтому копия
 * связана с оригиналом зубом сходства: разъедутся — покраснеет
 * `sample-library-paging-twins.test.ts`.
 *
 * Показываем И диапазон, И номер страницы: «41–80 из 1057» отвечает на «сколько всего», а
 * «2 / 27» — на «где я». Одно без другого уже приводило к тому, что доля страницы выдавала себя
 * за долю набора (#2237).
 *
 * ДОСТУПНОСТЬ (спринт sample-library-paging-a11y, ратифицировано владельцем 29.09):
 *  • индикатор страницы — живая область `role="status"`: смена страницы объявляется читателю
 *    экрана скрытой фразой «Страница 2 из 27, записи 41–80 из 1057»; видимое «2 / 27» не меняется.
 *    `aria-current` снят: набора страниц здесь нет, и атрибут ничего не означал;
 *  • фокус после смены страницы остаётся на нажатой кнопке, пока она активна; на краю диапазона
 *    (кнопка запирается под пальцем — Chromium уронил бы фокус на `body`) переходит на соседнюю;
 *  • `loading` кнопки НЕ запирает `disabled`: `aria-disabled` + `btn-disabled`, `aria-busy` на
 *    `nav`, клик гасится — фокус и Tab-порядок не двигаются;
 *  • клавиатура — родные `<button>`; слушателей на `window`/`document` нет, стрелок нет: ввод в
 *    соседних полях не задет.
 */
export interface SampleLibraryPaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
  readonly from: number;
  readonly to: number;
  readonly loading?: boolean;
  readonly onPageChange: (page: number) => void;
}

type PagingDirection = 'prev' | 'next';

/**
 * Правило фокуса после смены страницы — одно на двух близнецов (зуб сравнивает тело побайтно).
 *
 * Фокус остаётся на нажатой кнопке, пока она активна. Если после смены она заперта (край
 * диапазона), фокус переходит на соседнюю: иначе Chromium уронит его на `body`, и человек с
 * клавиатуры потеряет место. Нажатие помнится ссылкой, а не состоянием — перерисовки не нужно.
 */
function useFocusAfterPageChange(
  page: number,
  lockedPrev: boolean,
  lockedNext: boolean,
  prevRef: RefObject<HTMLButtonElement | null>,
  nextRef: RefObject<HTMLButtonElement | null>,
) {
  const pressed = useRef<PagingDirection | null>(null);
  useEffect(() => {
    const dir = pressed.current;
    if (dir === null) return;
    pressed.current = null;
    const pressedLocked = dir === 'next' ? lockedNext : lockedPrev;
    if (!pressedLocked) return;
    const sibling = dir === 'next' ? prevRef.current : nextRef.current;
    sibling?.focus();
  }, [page, lockedPrev, lockedNext, prevRef, nextRef]);
  return pressed;
}

export function SampleLibraryPagination({
  page,
  totalPages,
  total,
  from,
  to,
  loading = false,
  onPageChange,
}: SampleLibraryPaginationProps) {
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const lockedPrev = page <= 1;
  const lockedNext = page >= totalPages;
  const pressed = useFocusAfterPageChange(page, lockedPrev, lockedNext, prevRef, nextRef);

  if (totalPages <= 1) return null;

  const go = (dir: PagingDirection) => {
    if (loading) return;
    pressed.current = dir;
    onPageChange(dir === 'next' ? page + 1 : page - 1);
  };
  const buttonClass = `btn btn-sm join-item${loading ? ' btn-disabled' : ''}`;

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-3"
      aria-label="Пагинация таблицы сэмплов"
      aria-busy={loading || undefined}
    >
      <span className="text-sm text-base-content/60 tabular-nums">
        {from}–{to} из {total}
      </span>
      <div className="join">
        <button
          type="button"
          ref={prevRef}
          className={buttonClass}
          disabled={lockedPrev}
          aria-disabled={loading || undefined}
          onClick={() => go('prev')}
        >
          Назад
        </button>
        <span
          className="btn btn-sm join-item btn-disabled tabular-nums"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span aria-hidden="true">
            {page} / {totalPages}
          </span>
          <span className="sr-only">
            Страница {page} из {totalPages}, записи {from}–{to} из {total}
          </span>
        </span>
        <button
          type="button"
          ref={nextRef}
          className={buttonClass}
          disabled={lockedNext}
          aria-disabled={loading || undefined}
          onClick={() => go('next')}
        >
          Вперёд
        </button>
      </div>
    </nav>
  );
}
