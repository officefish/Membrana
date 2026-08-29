/**
 * Гипотеза ценности записи перед необратимым удалением (#2218, заказ владельца 29.08).
 *
 * ЗАЧЕМ. Удаление необратимо, а буфер выглядит как мусорное ведро — и выглядел им ровно до
 * того дня, когда его пересчитали. 28.08 в живом буфере лежало 1747 проб, и **1692 из них**
 * оказались вещдоками двух документированных окон: ночного дежурства 23.08 (1136 проб, ноль
 * разрывов) и размеченного владельцем на слух часа 21.08. Защищена была ровно ОДНА. Кнопка
 * «удалить сто самых ранних» съела бы начало документированной ночи, и никакой экран об
 * этом бы не предупредил.
 *
 * ЧТО ЭТО ЗА СУЩНОСТЬ. Не право и не запрет: удалять человек вправе. Это ГИПОТЕЗА — довод
 * машины о том, чем запись может оказаться, сказанный ДО нажатия, а не после. Поэтому
 * каждый вердикт несёт `why` человеческой строкой: она едет человеку на экран рядом с
 * именем файла, а не в лог.
 *
 * ГРАНИЦА С ЗАЩИТОЙ. `isPinnedByHuman` (buffer-cleanup.ts) отвечает на вопрос «можно ли
 * удалять машинно» и умеет только «да/нет». Здесь вопрос другой — «что человек теряет», и
 * ответ трёхступенчатый. Смешивать их нельзя: защита останавливает уборку, гипотеза
 * ничего не останавливает, она рассказывает.
 */
import type { Collection, MediaSample } from './types.js';

/** Ступени ценности. Порядок значим: первая подошедшая выигрывает. */
export type DeletionValueLevel = 'evidence' | 'curated' | 'ordinary';

export interface DeletionValueVerdict {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly sizeBytes: number;
  readonly level: DeletionValueLevel;
  /** Человеческая причина: едет на экран рядом с именем файла. */
  readonly why: string;
}

/**
 * Окно вещдока — запись, объявленная доказательством в полевом документе.
 *
 * Машинная копия `docs/field/evidence-windows.json`; источник истины — документ в `doc`.
 * Копий две (репозиторный JSON для скриптов и эта константа для домов), и держит их
 * вместе зуб `deletion-value.test.ts` — не внимательность.
 */
export interface EvidenceWindow {
  readonly id: string;
  readonly doc: string;
  readonly deviceId: string;
  readonly from: string;
  readonly to: string;
  readonly why: string;
}

export const EVIDENCE_WINDOWS: readonly EvidenceWindow[] = Object.freeze([
  Object.freeze({
    id: 'night-duty-2026-08-23',
    doc: 'docs/field/2026-08-23-night-duty-journal-congestion.md',
    deviceId: '1c04f0bc-29b0-4d3f-a437-d87dc879579d',
    from: '2026-08-23T18:00:00.000Z',
    to: '2026-08-23T19:40:00.000Z',
    why: 'ночное дежурство 23.08: 1136 проб, ноль разрывов, все 48 кГц',
  }),
  Object.freeze({
    id: 'listening-session-2026-08-21',
    doc: 'docs/field/session-2026-08-21-listening.md',
    deviceId: '1c04f0bc-29b0-4d3f-a437-d87dc879579d',
    from: '2026-08-21T09:45:00.000Z',
    to: '2026-08-21T10:45:00.000Z',
    why: 'часовой сеанс 21.08, размеченный владельцем на слух',
  }),
]);

/** Слова, которыми человек метит запись «не трогать». Те же, что знает защита уборки. */
const KEEP_WORDS = /хранить|не удалять|вещдок/u;
const KEEP_LATIN = /\bkeep\b/u;

/** Запись попадает в объявленное окно вещдока? Границы включительные. */
export function evidenceWindowOf(
  sample: Pick<MediaSample, 'createdAt'>,
  deviceId?: string,
  windows: readonly EvidenceWindow[] = EVIDENCE_WINDOWS,
): EvidenceWindow | null {
  const t = Date.parse(sample.createdAt);
  if (!Number.isFinite(t)) return null;
  for (const w of windows) {
    if (deviceId && w.deviceId !== deviceId) continue;
    const a = Date.parse(w.from);
    const b = Date.parse(w.to);
    if (Number.isFinite(a) && Number.isFinite(b) && t >= a && t <= b) return w;
  }
  return null;
}

export interface DeletionValueContext {
  /** Наборы устройства — чтобы назвать набор ИМЕНЕМ, а не идентификатором. */
  readonly collections?: readonly Collection[];
  /** Устройство: окна вещдоков привязаны к нему. */
  readonly deviceId?: string;
  readonly windows?: readonly EvidenceWindow[];
}

const LABEL_WORDS: Record<string, string> = {
  drone: 'дрон',
  'not-drone': 'не дрон',
};

/**
 * Гипотеза ценности одной записи.
 *
 * Порядок правил — от сильного довода к слабому; первый подошедший выигрывает и объясняет
 * себя. «Рядовая» — не приговор, а отсутствие доводов: так и сказано словами.
 */
export function assessDeletionValue(
  sample: MediaSample,
  ctx: DeletionValueContext = {},
): DeletionValueVerdict {
  const base = {
    id: sample.id,
    title: sample.title,
    createdAt: sample.createdAt,
    sizeBytes: sample.sizeBytes,
  };

  const notes = (sample.notes ?? '').toLowerCase();
  if (KEEP_LATIN.test(notes) || KEEP_WORDS.test(notes)) {
    return { ...base, level: 'evidence', why: 'помечена человеком «хранить» — снята с уборки вручную' };
  }

  const window = evidenceWindowOf(sample, ctx.deviceId, ctx.windows);
  if (window) {
    return {
      ...base,
      level: 'evidence',
      why: `входит в окно вещдока «${window.id}»: ${window.why}; ссылается ${window.doc}`,
    };
  }

  const collection = ctx.collections?.find((c) => c.id === sample.collectionId);
  if (collection && collection.kind === 'user') {
    return {
      ...base,
      level: 'curated',
      why: `лежит в наборе «${collection.name}» — её туда положили руками`,
    };
  }
  if (collection && collection.kind === 'system') {
    return { ...base, level: 'curated', why: `входит в системный набор «${collection.name}»` };
  }

  if (sample.label !== 'unlabeled') {
    return {
      ...base,
      level: 'curated',
      why: `размечена человеком: ${LABEL_WORDS[sample.label] ?? sample.label}`,
    };
  }

  return { ...base, level: 'ordinary', why: 'рядовая проба приёмного лотка: без метки, вне наборов и объявленных окон' };
}

export interface DeletionValueSummary {
  readonly total: number;
  readonly evidence: number;
  readonly curated: number;
  readonly ordinary: number;
  readonly bytes: number;
  /** Одной строкой для шапки окна — чтобы человек прочёл, не разбирая таблицу. */
  readonly headline: string;
  readonly verdicts: readonly DeletionValueVerdict[];
}

/**
 * Склонение по-русски. «Уйдёт безвозвратно 1 записей» человек читает как машинную строку и
 * перестаёт ей верить как речи; окно предупреждает о необратимом, и говорить оно обязано
 * по-человечески.
 */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Мегабайты человеку, а не байты. */
function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

/**
 * Оценка целого списка к удалению. Отдаёт и разбор по записям, и одну строку сверху.
 *
 * Порядок в выдаче: сперва ценные. Человек читает сверху вниз и обязан увидеть худшее
 * первым, а не найти его прокруткой на сороковой строке.
 */
export function assessDeletion(
  samples: readonly MediaSample[],
  ctx: DeletionValueContext = {},
): DeletionValueSummary {
  const rank: Record<DeletionValueLevel, number> = { evidence: 0, curated: 1, ordinary: 2 };
  const verdicts = samples
    .map((s) => assessDeletionValue(s, ctx))
    .sort((a, b) => rank[a.level] - rank[b.level] || a.createdAt.localeCompare(b.createdAt));

  const evidence = verdicts.filter((v) => v.level === 'evidence').length;
  const curated = verdicts.filter((v) => v.level === 'curated').length;
  const ordinary = verdicts.length - evidence - curated;
  const bytes = verdicts.reduce((a, v) => a + (v.sizeBytes ?? 0), 0);

  const n = verdicts.length;
  const parts: string[] = [
    `${plural(n, 'Уйдёт', 'Уйдут', 'Уйдут')} безвозвратно ${n} ${plural(n, 'запись', 'записи', 'записей')}, ${mb(bytes)}`,
  ];
  if (evidence > 0) parts.push(`из них вещдоков: ${evidence}`);
  if (curated > 0) parts.push(`разобранных руками: ${curated}`);
  if (evidence === 0 && curated === 0 && n > 0) parts.push('ценных среди них не найдено');

  return {
    total: verdicts.length,
    evidence,
    curated,
    ordinary,
    bytes,
    headline: `${parts.join(' · ')}.`,
    verdicts,
  };
}
