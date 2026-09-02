/**
 * Срок ключа-предъявителя: умолчание и его fail-closed ветка (вердикт M3 заседания
 * `library-open-api`, блок коворка `key-ttl`).
 *
 * ПОЧЕМУ ЭТОТ ФАЙЛ ВООБЩЕ ЕСТЬ. Вердикт M3 говорит о коде в модальности требования, а не
 * описания: «"защита по умолчанию" — ТРЕБОВАНИЕ К КОДУ». И называет, чем оно обязано
 * держаться — веткой, которая при пустом, невалидном или повреждённом значении подставит
 * ИМЕНОВАННУЮ КОНСТАНТУ, а не `null`. Без такой ветки «по умолчанию защищено» есть надежда,
 * а не факт о коде.
 *
 * СОСТОЯНИЙ ТРИ, А НЕ ДВА. Шторм закрыл два факта, тянущих в разные стороны: защита стоит по
 * умолчанию — и бессрочная ссылка есть воля владельца записей, оборонять его от собственного
 * выбора не наша работа. Оба держатся одновременно ровно тогда, когда «не записано» и
 * «записано «бессрочно»» — РАЗНЫЕ состояния. Отсюда инвариант, который стерегут зубы:
 *
 *     seconds === null возможно ТОЛЬКО при source === 'lifted'.
 *
 * Бессрочность не ВОЗНИКАЕТ из пустоты, порчи, NaN или прошедшей даты — она НАЗНАЧАЕТСЯ. И
 * назначается подписанным движением человека: `{ mode: 'lifted', liftedAt, liftedBy }`. Снятие
 * без провенанса неотличимо от повреждённой записи, поэтому трактуется как порча.
 *
 * ВЛАДЕЛЕЦ ВРЕМЕНИ — ВЫЗЫВАЮЩИЙ. Внутри нет `Date.now()`: часы приходят параметром, иначе тот
 * же вход давал бы разные вердикты и зуб на «дату в прошлом» удостоверял бы погоду.
 *
 * МАСШТАБ — МЕМБРАНА. Функция не принимает ни `collectionId`, ни `kind`, ни `sampleId`.
 * Отсутствие параметра и есть исполнимая форма вердикта «в отдельную область управления не
 * выделен»: приёмный лоток попадает под тот же выключатель, что именованные наборы.
 */

/**
 * Умолчание срока ключа-предъявителя — 15 минут, в СЕКУНДАХ.
 *
 * Разряд выбран собственный, а не списан со словаря УЗЛОВЫХ ключей (`hours_4` … `months_3`):
 * эпик прямо называет те разряды «не того порядка». Довод:
 *  - разряд узлового ключа — жизнь прибора; его носитель опознан, ключ отзывается ПОШТУЧНО
 *    (`NodeKey.revokedAt`), и длинный срок оплачен возможностью погасить один ключ;
 *  - разряд ключа-предъявителя — ОДНО ПРЕДЪЯВЛЕНИЕ; носитель анонимен на получении, поштучного
 *    отзыва нет по конструкции, значит окно риска равно сроку, а гасится оно только ротацией,
 *    то есть ценой всех остальных ссылок. Срок здесь не удобство, а единственная передняя
 *    граница;
 *  - снизу разряд подпирает честный сценарий: страница списка — до 100 проб (потолок M4),
 *    минута-две ломают законную выемку страницы на скромном канале, 15 минут покрывают с
 *    запасом;
 *  - сверху — цена утечки: связка ключей при сроке в часы превращает одну утечку в дневную
 *    дыру, гасимую только ротацией. За 15 минут связка протухает раньше, чем расходится.
 */
export const DEFAULT_TRACK_KEY_TTL = 15 * 60;

/**
 * Потолок срока — 30 суток, в секундах.
 *
 * Значение сверх потолка — не «очень долгий срок», а величина, неотличимая от порчи: `1e12` в
 * поле выглядит намерением ровно так же, как опечаткой. Бессрочность назначается СЛОВОМ
 * (`mode: 'lifted'` с провенансом), а не величиной, — поэтому всё, что просит больше потолка,
 * уходит в fail-closed на константу.
 */
export const MAX_TRACK_KEY_TTL = 30 * 24 * 60 * 60;

/** Откуда взялся срок. `lifted` — единственный источник, где `seconds` может быть `null`. */
export const TRACK_KEY_TTL_SOURCES = ['configured', 'default', 'lifted'] as const;
export type TrackKeyTtlSource = (typeof TRACK_KEY_TTL_SOURCES)[number];

/**
 * Закрытый словарь причин, по которым подставлено умолчание. Молчаливой подстановки нет:
 * каждый fail-closed случай называет себя поимённо — иначе приёмка не отличит «человек не
 * открывал блок» от «запись повреждена».
 */
export const TRACK_KEY_TTL_FALLBACK_REASONS = [
  /** Значения нет вовсе: человек не открывал блок настроек, хранилище пусто. */
  'absent',
  /** Пустая строка / одни пробелы. */
  'blank',
  /** Не число и не дата: `'soon'`, `true`, массив, функция. */
  'not-a-number',
  /** Ровно `NaN`. */
  'nan',
  /** `Infinity` / `-Infinity`. */
  'not-finite',
  /** Отрицательный срок. */
  'negative',
  /** Ноль или срок, вырождающийся в ноль при усечении до секунд. */
  'zero',
  /** Абсолютная дата истечения уже в прошлом. */
  'expired',
  /** Структура записи не та: обрезанный JSON, `mode` без обязательных полей, снятие без подписи. */
  'malformed',
  /** Величина сверх `MAX_TRACK_KEY_TTL`. */
  'over-ceiling',
] as const;
export type TrackKeyTtlFallbackReason = (typeof TRACK_KEY_TTL_FALLBACK_REASONS)[number];

/** Причина вердикта: либо одна из fail-closed, либо явный выбор человека. */
export type TrackKeyTtlReason =
  | TrackKeyTtlFallbackReason
  /** Срок задан числом и принят как есть. */
  | 'configured'
  /** Человек подписанным движением снял срок. */
  | 'lifted'
  /** Человек открыл блок и оставил умолчание — та же константа, но выбранная, а не подставленная. */
  | 'default-chosen';

export interface ResolvedTrackKeyTtl {
  /** Секунды жизни ссылки. `null` — ТОЛЬКО при `source === 'lifted'`. */
  readonly seconds: number | null;
  readonly source: TrackKeyTtlSource;
  readonly reason: TrackKeyTtlReason;
}

/**
 * Форма записи, которую пишет блок настроек кабинета. В стволе блока НЕТ (сверено 02.09), эта
 * форма — одностороннее ожидание блока `key-ttl` (см. EXPECTATIONS.md), сведение — Phase 3.
 */
export type TrackKeyTtlSetting =
  | { mode: 'default' }
  | { mode: 'seconds'; seconds: number | string }
  | { mode: 'lifted'; liftedAt: string; liftedBy: string };

/**
 * Вход резолвера — СЫРОЕ значение из хранилища. Тип намеренно `unknown`: доверия к записи нет,
 * и именно поэтому ветка ниже существует. Приняв здесь `TrackKeyTtlSetting`, мы бы объявили
 * порчу невозможной по типу — то есть спрятали бы ровно тот случай, ради которого вердикт M3
 * потребовал ветку.
 */
export type StoredTrackKeyTtl = unknown;

/**
 * ЕДИНСТВЕННОЕ МЕСТО, ГДЕ РОЖДАЕТСЯ УМОЛЧАНИЕ.
 *
 * Строка с якорем `fail-closed:branch` — это и есть вся «защита по умолчанию». Порча-зуб
 * (`track-key-ttl.porcha.test.ts`) читает ЖИВОЙ исходник, подменяет константу на `null` по
 * этому якорю и требует, чтобы перебор порчи покраснел. Якорь двигать вместе с зубом.
 */
const withDefault = (reason: TrackKeyTtlReason): ResolvedTrackKeyTtl => ({
  /* fail-closed:branch */ seconds: DEFAULT_TRACK_KEY_TTL,
  source: 'default',
  reason,
});

const configured = (seconds: number): ResolvedTrackKeyTtl => ({
  seconds,
  source: 'configured',
  reason: 'configured',
});

const LIFTED: ResolvedTrackKeyTtl = { seconds: null, source: 'lifted', reason: 'lifted' };

const NUMERIC = /^[+-]?\d+(\.\d+)?$/;

const isFilledString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Срок, заданный числом секунд. */
function fromSeconds(raw: number): ResolvedTrackKeyTtl {
  if (Number.isNaN(raw)) return withDefault('nan');
  if (!Number.isFinite(raw)) return withDefault('not-finite');
  if (raw < 0) return withDefault('negative');
  const seconds = Math.floor(raw);
  if (seconds === 0) return withDefault('zero');
  if (seconds > MAX_TRACK_KEY_TTL) return withDefault('over-ceiling');
  return configured(seconds);
}

/** Срок, заданный абсолютной датой истечения: переводится в секунды по часам вызывающего. */
function fromAbsolute(at: Date, now: Date): ResolvedTrackKeyTtl {
  const stamp = at.getTime();
  if (Number.isNaN(stamp)) return withDefault('not-a-number');
  const seconds = Math.floor((stamp - now.getTime()) / 1000);
  if (seconds <= 0) return withDefault('expired');
  if (seconds > MAX_TRACK_KEY_TTL) return withDefault('over-ceiling');
  return configured(seconds);
}

/** Скаляр-строка: число секунд, ISO-дата истечения — или порча. */
function fromString(raw: string, now: Date): ResolvedTrackKeyTtl {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return withDefault('blank');
  if (NUMERIC.test(trimmed)) return fromSeconds(Number(trimmed));
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return withDefault('not-a-number');
  return fromAbsolute(parsed, now);
}

/** Число секунд, пришедшее числом или числовой строкой (поле `seconds` записи). */
function fromNumberish(raw: unknown): ResolvedTrackKeyTtl {
  if (typeof raw === 'number') return fromSeconds(raw);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return withDefault('blank');
    if (!NUMERIC.test(trimmed)) return withDefault('not-a-number');
    return fromSeconds(Number(trimmed));
  }
  return withDefault('malformed');
}

/** Запись настройки: разобранная форма кабинета плюс терпимость к паре сырых форм. */
function fromRecord(raw: Record<string, unknown>, now: Date): ResolvedTrackKeyTtl {
  const mode = raw.mode;

  if (mode === 'default') return withDefault('default-chosen');

  if (mode === 'seconds') {
    if (!('seconds' in raw) || raw.seconds === null || raw.seconds === undefined) {
      return withDefault('malformed');
    }
    return fromNumberish(raw.seconds);
  }

  if (mode === 'lifted') {
    // Снятие срока — «явное движение человека» (шторм). Движение без подписи неотличимо от
    // повреждённой записи, поэтому здесь fail-closed, а не бессрочность.
    if (!isFilledString(raw.liftedBy)) return withDefault('malformed');
    if (!isFilledString(raw.liftedAt)) return withDefault('malformed');
    if (Number.isNaN(new Date(raw.liftedAt).getTime())) return withDefault('malformed');
    return LIFTED;
  }

  if (mode !== undefined) return withDefault('malformed');

  // Терпимость к сырым формам: `{ seconds }` и `{ expiresAt }` без `mode`.
  if ('seconds' in raw) return fromNumberish(raw.seconds);
  if ('expiresAt' in raw) {
    const at = raw.expiresAt;
    if (at instanceof Date) return fromAbsolute(at, now);
    if (typeof at === 'string') return fromString(at, now);
    if (typeof at === 'number') return fromAbsolute(new Date(at), now);
    return withDefault('malformed');
  }

  return withDefault('malformed');
}

/**
 * Разобрать сырую настройку срока мембраны в вердикт.
 *
 * Чистая функция: без сети, без часов, без хранилища. Всё, что не опознано как валидный срок
 * или подписанное снятие, даёт `DEFAULT_TRACK_KEY_TTL` с названной причиной.
 */
export function resolveTrackKeyTtl(
  stored: StoredTrackKeyTtl,
  opts: { now?: Date } = {},
): ResolvedTrackKeyTtl {
  const now = opts.now ?? new Date();
  // Сломанные часы — тоже порча входа: без опоры «дата в прошлом» не вычисляется.
  if (Number.isNaN(now.getTime())) return withDefault('malformed');

  if (stored === null || stored === undefined) return withDefault('absent');
  if (typeof stored === 'string') return fromString(stored, now);
  if (typeof stored === 'number') return fromSeconds(stored);
  if (stored instanceof Date) return fromAbsolute(stored, now);
  if (typeof stored === 'object' && !Array.isArray(stored)) {
    return fromRecord(stored as Record<string, unknown>, now);
  }
  // boolean, массив, функция, symbol, bigint — форма не та.
  return withDefault('malformed');
}

/** Бессрочность назначена человеком. Единственный законный носитель `seconds === null`. */
export const isLiftedTtl = (ttl: ResolvedTrackKeyTtl): boolean => ttl.source === 'lifted';

/**
 * Момент истечения по вердикту. `null` — только у снятого срока; у любой порчи момент есть,
 * потому что есть константа.
 */
export function trackKeyExpiresAt(ttl: ResolvedTrackKeyTtl, now: Date): Date | null {
  if (ttl.seconds === null) return null;
  return new Date(now.getTime() + ttl.seconds * 1000);
}
