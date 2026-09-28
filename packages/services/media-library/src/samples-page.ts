/**
 * СТРАНИЦА СПИСКА ПРОБ — одно правило на ДВА КЛИЕНТСКИХ ДОМА: кабинет и Studio (#2505).
 *
 * Здесь живёт только арифметика, без React, без DOM и без запросов: размер страницы объявлен
 * рядом (`DEFAULT_SAMPLES_PAGE_SIZE` в `constants.ts`), и правило страницы стоит там же, чтобы
 * «страница 3 из 27» у кабинета и у Studio означала одно и то же.
 *
 * ПРО ДВЕРЬ — БЕЗ ПРИСВОЕНИЯ. Дверь (`packages/background-media/src/lib/pagination.ts`) сюда НЕ
 * ходит и ходить не может: серверный контур не зависит от клиентского слоя доступа. У неё своё
 * объявление того же числа и своя `buildPageMeta`. Всего объявлений сорока в дереве три, и все
 * три старше этой правки: слой доступа (здесь), дверь, и оболочка Electron
 * (`apps/membrana-studio/src/media-library/constants.ts`, которой запрещено импортировать сервис
 * в main). Ни одно этой правкой не тронуто: числа сведены не общим носителем, а зубом СОГЛАСИЯ в
 * `sample-library-paging-twins.test.ts`. Скажи здесь «одно место на дверь» — и получится ложь, за
 * которой перестанут проверять сами копии.
 *
 * Почему это общее место, а не по копии в каждом доме. Копий правила было бы две (кабинет и
 * Studio), и вторая молча разъехалась бы первой же правкой: дома живут в разных приложениях, и
 * ничто, кроме зуба, их не сводит. React-носителя органов листания это НЕ касается: разметка у
 * приложений своя, и общего пакета под один `nav` сегодня нет (см. #2497).
 */
import { DEFAULT_SAMPLES_PAGE_SIZE } from './constants.js';

/**
 * Приведение номера страницы к живому диапазону.
 *
 * Тот класс ошибки, который #2181 закрыл для НАБОРА, а для СТРАНИЦЫ он оставался: список сменился
 * (другой набор, другой фильтр, удалили пробы, вывезли буфер), а номер страницы остался прежним.
 * Дальше хуже: у кабинета органы листания скрываются при `totalPages <= 1`, так что человек с
 * запомненной страницей 3 попадал на пустой список БЕЗ кнопки «Назад» — в ловушку, а не просто на
 * неверную страницу.
 *
 * Пустой список — это `totalPages === 0` (так считает и дверь, `buildPageMeta`), и страница у него
 * всё равно первая: «страница 0» не существует.
 */
export function clampSamplesPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  const last = Math.max(1, Math.trunc(Number.isFinite(totalPages) ? totalPages : 1));
  return Math.min(Math.max(1, Math.trunc(page)), last);
}

export interface SamplesPageWindow<T> {
  /** Номер страницы, ПРИВЕДЁННЫЙ к живому диапазону. */
  readonly page: number;
  /** Сколько страниц у списка. Пустой список — 0 страниц, не одна (как у двери). */
  readonly totalPages: number;
  /** Сколько записей во ВСЁМ списке, а не на экране. */
  readonly total: number;
  readonly pageSize: number;
  /** Номер первой записи страницы, счёт с 1. Пустой список — 0: «0–0 из 0» честнее «1–0». */
  readonly from: number;
  readonly to: number;
  /** Окно страницы — то, что уходит в отрисовку. */
  readonly items: readonly T[];
}

/**
 * Окно страницы по УЖЕ загруженному списку — для дома, который держит набор целиком и листает
 * отрисовку (Studio). Дом, который листает саму загрузку (кабинет), берёт числа у двери и
 * пользуется только `clampSamplesPage`.
 *
 * Оба числа — «сколько на экране» (`from`–`to`, `items`) и «сколько всего» (`total`) — уезжают
 * ВМЕСТЕ: разводить их по вызывающим уже пробовали (#2237), и следующий потребитель про поправку
 * не узнавал.
 */
export function resolveSamplesPageWindow<T>(
  items: readonly T[],
  page: number,
  pageSize: number = DEFAULT_SAMPLES_PAGE_SIZE,
): SamplesPageWindow<T> {
  const size = Math.max(1, Math.trunc(pageSize));
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / size);
  const current = clampSamplesPage(page, totalPages);
  const start = (current - 1) * size;
  return {
    page: current,
    totalPages,
    total,
    pageSize: size,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
    items: items.slice(start, start + size),
  };
}
