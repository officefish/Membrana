/**
 * Общее ядро управляемой сборки мусора в буфере — для ОБОИХ домов (#2204).
 *
 * Слово владельца 27.08: плагин доступен и в библиотеке сэмплов, и в журнале телеметрии;
 * ядро одно в `packages/`, креплений два — как у чарт-листа (#2110). Здесь то, что не
 * зависит от приложения: словари ручек человека, отбор по счёту и защита вещдоков.
 *
 * ЧИСТКА ПО СЧЁТУ, НЕ ПО ОБЪЁМУ. «Почистить на 200 МБ» человеку не подотчётно: он не
 * знает, сколько проб под этим числом уйдёт. «Удалить 100 самых ранних» — знает, и видит
 * список перед подтверждением. Мегабайты остаются СЛЕДСТВИЕМ выбора и показываются рядом,
 * но выбором не являются.
 *
 * ОТЛИЧИЕ ОТ ЧИСТКИ ДУБЛЕЙ (#2109) несущее, ядра не смешиваются: там мера похожести и
 * «показать пары, ждать слова о каждой»; здесь счёт и время — отбор детерминирован
 * порядком, а не сравнением проб между собой.
 *
 * НЕОБРАТИМОСТЬ. Удаление проб необратимо, поэтому ядро отдаёт ПЛАН (что уйдёт, сколько
 * это мегабайт, что защищено и почему), а не выполняет удаление. Исполнение — в доме,
 * после явного подтверждения человека, и только по идентификаторам из плана.
 */
import type { MediaSample } from './types.js';

/** Принципы отбора — закрытый список из заказа владельца 27.08. */
export const BUFFER_CLEANUP_PRINCIPLES = [
  { value: 'oldest', title: 'Самые ранние' },
  { value: 'newest', title: 'Самые поздние' },
] as const;

export type BufferCleanupPrinciple = (typeof BUFFER_CLEANUP_PRINCIPLES)[number]['value'];

/** Объёмы — закрытый список; тот же по духу, что у чарт-листа, но свой по числам. */
export const BUFFER_CLEANUP_VOLUMES = [20, 50, 100, 200] as const;

export type BufferCleanupVolume = (typeof BUFFER_CLEANUP_VOLUMES)[number];

/**
 * Объём пришёл из словаря? Ядро принимает `number`, потому что число приезжает с формы дома
 * строкой; проверка обязана быть ЯВНОЙ и в доме, а не молчаливым доверием (P2 ревью #2207).
 */
export function isBufferCleanupVolume(value: unknown): value is BufferCleanupVolume {
  return (BUFFER_CLEANUP_VOLUMES as readonly number[]).includes(Number(value));
}

/**
 * Почему проба защищена от удаления. Строка человеческая: она попадёт человеку на экран
 * рядом с именем пробы, а не в лог.
 */
export interface ProtectedSample {
  readonly id: string;
  readonly title: string;
  readonly why: string;
}

/** План уборки: что уйдёт, что защищено, сколько освободится. */
export interface BufferCleanupPlan {
  readonly principle: BufferCleanupPrinciple;
  readonly requested: number;
  /** Пробы к удалению — в том порядке, в каком их увидит человек. */
  readonly doomed: readonly MediaSample[];
  /** Отобранные, но защищённые: названы отдельно, а не выброшены молча. */
  readonly protectedOut: readonly ProtectedSample[];
  /** Сколько освободится, если подтвердить, — следствие выбора, не сам выбор. */
  readonly freedBytes: number;
  /** Сколько проб останется в буфере после уборки. */
  readonly remaining: number;
  /**
   * Набралось меньше запрошенного (буфер короче либо остальное защищено). Пустое поле —
   * норма; заполненное человек обязан увидеть до подтверждения, иначе «удалил 100» окажется
   * «удалил 63» без объяснения.
   */
  readonly shortfall: string | null;
}

/**
 * Вещдок: проба, на которую ссылается закрытый документ (приёмка спринта, отчёт, кейс).
 *
 * ПОВОД. 22.08 в буфере нашлись восемь проб, на которые ссылается приёмочный документ
 * закрытого спринта, и они не были помечены никак. «Самые ранние» бьют по ним первыми —
 * они и накопились раньше всех. Поэтому защита не «пометка в базе», а СПИСОК ССЫЛОК,
 * приходящий снаружи: дом знает, кто ссылается, ядро знает, что этого нельзя трогать.
 */
export interface SampleReference {
  readonly sampleId: string;
  /** Кто ссылается — путь документа или его имя; попадёт человеку на экран. */
  readonly referencedBy: string;
}

/** Помечена ли проба руками человека как хранимая (заметка `keep`, метка не-`unlabeled`). */
export function isPinnedByHuman(sample: MediaSample): boolean {
  const notes = (sample.notes ?? '').toLowerCase();
  // \b — граница по ASCII-словам: перед кириллицей она не срабатывает, и «не удалять»
  // молча не защищало бы пробу (поймано зубом). Латинское keep держим в границах, чтобы
  // не ловить housekeeping; русские пометки ищем подстрокой.
  if (/\bkeep\b/u.test(notes) || /хранить|не удалять/u.test(notes)) return true;
  return sample.label !== 'unlabeled';
}

/**
 * Отбор по принципу и объёму с защитой вещдоков.
 *
 * Порядок: по `createdAt` возрастанием для «самых ранних», убыванием для «самых поздних».
 * Ключ — время создания, а не порядок в массиве: массив приходит из разных домов и его
 * порядок не гарантирован.
 *
 * @param samples пробы буфера (весь набор, не страница)
 * @param p принцип, объём и известные ссылки
 */
export function planBufferCleanup(
  samples: readonly MediaSample[],
  p: {
    principle: BufferCleanupPrinciple;
    volume: number;
    references?: readonly SampleReference[];
  },
): BufferCleanupPlan {
  const byRef = new Map<string, string[]>();
  for (const r of p.references ?? []) {
    const list = byRef.get(r.sampleId) ?? [];
    list.push(r.referencedBy);
    byRef.set(r.sampleId, list);
  }

  // Проба с непрочитанным временем в отборе по времени участвовать не может. Раньше
  // компаратор возвращал для неё 0, и она оказывалась где придётся — то есть могла уйти под
  // нож молча (P2 ревью #2207). Отбор по времени, значит нет времени — нет и приговора:
  // такая проба уходит в защищённые с названной причиной.
  const timeless: MediaSample[] = [];
  const timed: { sample: MediaSample; at: number }[] = [];
  for (const s of samples) {
    const at = Date.parse(s.createdAt);
    if (Number.isNaN(at)) timeless.push(s);
    else timed.push({ sample: s, at });
  }

  const ordered = timed
    .sort((a, b) => (p.principle === 'oldest' ? a.at - b.at : b.at - a.at))
    .map((t) => t.sample);

  const doomed: MediaSample[] = [];
  const protectedOut: ProtectedSample[] = timeless.map((s) => ({
    id: s.id,
    title: s.title,
    why: 'время создания не прочитано — отбор по времени её не судит',
  }));
  for (const s of ordered) {
    if (doomed.length >= p.volume) break;
    const refs = byRef.get(s.id);
    if (refs && refs.length > 0) {
      protectedOut.push({ id: s.id, title: s.title, why: `ссылается ${refs.join(', ')}` });
      continue;
    }
    if (isPinnedByHuman(s)) {
      protectedOut.push({ id: s.id, title: s.title, why: 'помечена человеком (метка или заметка)' });
      continue;
    }
    doomed.push(s);
  }

  const freedBytes = doomed.reduce((sum, s) => sum + (Number(s.sizeBytes) || 0), 0);
  const shortfall =
    doomed.length < p.volume
      ? `набралось ${doomed.length} из ${p.volume}: ${
          protectedOut.length > 0
            ? `${protectedOut.length} защищено (см. список), `
            : ''
        }в буфере ${samples.length} проб`
      : null;

  return {
    principle: p.principle,
    requested: p.volume,
    doomed,
    protectedOut,
    freedBytes,
    remaining: samples.length - doomed.length,
    shortfall,
  };
}

/**
 * Человеческая сводка плана — одной строкой, для заголовка подтверждения.
 * Мегабайты названы рядом со счётом: человек выбирает счётом, но видит цену в объёме.
 */
export function describeCleanupPlan(plan: BufferCleanupPlan): string {
  const title = plan.principle === 'oldest' ? 'самых ранних' : 'самых поздних';
  const mb = (plan.freedBytes / 1048576).toFixed(1);
  const tail = plan.protectedOut.length > 0 ? `, защищено ${plan.protectedOut.length}` : '';
  return `удалить ${plan.doomed.length} ${title} · освободится ${mb} МБ · останется ${plan.remaining}${tail}`;
}
