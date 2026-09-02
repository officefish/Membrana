/**
 * Генератор ключа-предъявителя для трека (вердикт M3, блок коворка `key-ttl`).
 *
 * ЧТО ЗДЕСЬ ЗА КОНСТРУКЦИЯ. Ссылка предъявительская по замыслу: авторизация — на выдаче,
 * анонимность — на получении. Отсюда прямое следствие, названное вердиктом M3 в лоб:
 * **поштучный отзыв невозможен**. Ключ один, все ссылки с ним равнозначны; единственный
 * механизм — РОТАЦИЯ, гасящая все ссылки разом.
 *
 * ЭТО УТВЕРЖДЕНИЕ О КОДЕ, А НЕ О НАМЕРЕНИИ. Поэтому:
 *  - поверхность генератора объявлена закрытым списком `TRACK_KEY_GENERATOR_SURFACE`, и зуб
 *    сверяет её с фактическим прототипом. Появится `revokeLink`/`revokeSample` — зуб краснеет.
 *    Комментарий «поштучно нельзя» такого не умеет;
 *  - служебные шаги вынесены в функции модуля, а не в методы класса: иначе прототип оброс бы
 *    именами, и закрытый список пришлось бы «поправлять» под реализацию, то есть перестал бы
 *    что-либо стеречь.
 *
 * ПОРЯДОК ПРОВЕРКИ ФИКСИРОВАН: ПОКОЛЕНИЕ → ПОДПИСЬ → СРОК. Ротация меняет и номер поколения,
 * и секрет. Спроси мы первым делом про срок — невыдохшая ссылка прожила бы ротацию, и «гасит
 * разом» превратилось бы в «гасит по мере истечения». Спроси мы первым делом про подпись —
 * старая ссылка получила бы вердикт `tampered` вместо честного `stale_generation`, то есть
 * диагноз соврал бы о причине.
 *
 * МАСШТАБ — МЕМБРАНА. `issue` принимает РОВНО `membraneId` и `sampleId` и отвергает запрос с
 * любым лишним ключом. Отсутствие параметра набора — исполнимая форма вердикта «приёмный
 * лоток под тот же выключатель попадает и в отдельную область управления не выделен»: место,
 * куда можно было бы просунуть исключение для лотка, физически отсутствует.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ. Квоты выдачи на мембрану (M4) — соседняя зона: генератор её не
 * эмулирует и не подменяет, порядок объявлен в EXPECTATIONS («квота → выдача»). Хранилища в
 * Prisma нет: `prisma/schema.prisma` — общий файл, его правило изоляции запрещает трогать,
 * поэтому хранилище живёт за интерфейсом, а адаптер — забота интеграции.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  resolveTrackKeyTtl,
  trackKeyExpiresAt,
  type ResolvedTrackKeyTtl,
  type StoredTrackKeyTtl,
} from './track-key-ttl';

/** Закрытый словарь исходов проверки — единые имена для маршрута, лога и приёмки. */
export const TRACK_KEY_VERDICTS = [
  'ok',
  /** Срок вышел. */
  'expired',
  /** Ключ выдан до ротации — мёртв независимо от срока. */
  'stale_generation',
  /** Подпись не сходится: тело правили. */
  'tampered',
  /** Не разбирается как токен. */
  'malformed',
  /** Мембрана не названа или ключа у неё нет: угадывать владельца дверь не вправе (M1). */
  'unknown_membrane',
] as const;
export type TrackKeyVerdict = (typeof TRACK_KEY_VERDICTS)[number];

/**
 * Закрытая поверхность генератора. Ровно три глагола: выдать · проверить · сменить.
 * Поштучного отзыва в списке НЕТ и быть не может — см. шапку файла.
 */
export const TRACK_KEY_GENERATOR_SURFACE = ['issue', 'verify', 'rotate'] as const;

/** Секрет мембраны и номер поколения. Секрет наружу не отдаётся никогда. */
export interface TrackKeySecretRecord {
  readonly membraneId: string;
  readonly generation: number;
  readonly secret: string;
  readonly rotatedAt: Date;
}

/**
 * Минимальный контракт хранилища секрета: ровно то, что нужно выдаче и ротации.
 *
 * СОЗДАНИЕ И ЗАМЕНА РАЗВЕДЕНЫ НАМЕРЕННО. Первая выдача заводит ключ мембраны лениво, и две
 * одновременные выдачи легко заводят его дважды — второй секрет затирает первый, и ссылка,
 * подписанная выброшенным секретом, приходит с вердиктом `tampered`. Диагноз при этом лжёт:
 * тела ключа никто не правил, его обесценила наша же гонка (поймано зубом ротации 02.09).
 * Поэтому создание объявлено АТОМАРНЫМ и возвращает фактически действующую запись, а не ту,
 * что мы предложили: у хранилища на это есть уникальный ключ, у вызывающего — нет.
 */
export interface TrackKeyStore {
  read(membraneId: string): Promise<TrackKeySecretRecord | null>;
  /** Атомарно: завести ключ, если его нет. Возвращает ДЕЙСТВУЮЩУЮ запись — свою или чужую. */
  createIfAbsent(record: TrackKeySecretRecord): Promise<TrackKeySecretRecord>;
  /** Заменить запись при ротации: новое поколение и новый секрет разом. */
  replace(record: TrackKeySecretRecord): Promise<void>;
}

/** Снимок настройки срока мембраны. Сырой: доверия к записи нет, разбирает резолвер. */
export interface TrackKeyTtlSettingsStore {
  read(membraneId: string): Promise<StoredTrackKeyTtl>;
}

export interface IssuedTrackLink {
  readonly membraneId: string;
  readonly sampleId: string;
  /** Сам ключ-предъявитель. Кладётся в объект пробы; отдельного звонка за ним нет (M2). */
  readonly key: string;
  /** ISO-8601 UTC либо `null` — и `null` приходит ТОЛЬКО из снятого человеком срока. */
  readonly expiresAt: string | null;
  readonly generation: number;
  /** Вердикт срока целиком: приёмка обязана видеть, подставлено умолчание или задано число. */
  readonly ttl: ResolvedTrackKeyTtl;
}

export type IssueOutcome =
  | { outcome: 'issued'; link: IssuedTrackLink }
  | { outcome: 'refused'; verdict: Extract<TrackKeyVerdict, 'unknown_membrane' | 'malformed'>; why: string };

export type VerifyOutcome =
  | {
      verdict: 'ok';
      membraneId: string;
      sampleId: string;
      generation: number;
      expiresAt: Date | null;
    }
  | { verdict: Exclude<TrackKeyVerdict, 'ok'> };

export type RotateOutcome =
  | {
      outcome: 'rotated';
      membraneId: string;
      generation: number;
      /** Поколение, погашенное этим движением. `null` — ключа ещё не было. */
      killedGeneration: number | null;
      rotatedAt: Date;
    }
  | { outcome: 'refused'; verdict: 'unknown_membrane'; why: string };

export interface TrackKeyGeneratorDeps {
  readonly keys: TrackKeyStore;
  readonly settings: TrackKeyTtlSettingsStore;
  /** Владелец времени — вызывающий; внутри `Date.now()` не зовётся. */
  readonly now: () => Date;
}

/** Длина секрета мембраны в байтах до base64url. */
export const TRACK_KEY_SECRET_BYTES = 32;

const ISSUE_REQUEST_KEYS = ['membraneId', 'sampleId'] as const;

const isFilledString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const encodePayload = (membraneId: string, generation: number, sampleId: string, exp: string): string =>
  Buffer.from(
    [encodeURIComponent(membraneId), String(generation), encodeURIComponent(sampleId), exp].join('|'),
    'utf8',
  ).toString('base64url');

const sign = (secret: string, payload: string): string =>
  createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

const signaturesEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

interface ParsedToken {
  readonly payload: string;
  readonly signature: string;
  readonly membraneId: string;
  readonly generation: number;
  readonly sampleId: string;
  readonly expiresAt: Date | null;
}

function parseToken(token: unknown): ParsedToken | null {
  if (!isFilledString(token)) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  let decoded: string;
  try {
    decoded = Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const parts = decoded.split('|');
  if (parts.length !== 4) return null;
  const rawMembrane = parts[0] ?? '';
  const rawGeneration = parts[1] ?? '';
  const rawSample = parts[2] ?? '';
  const rawExp = parts[3] ?? '';
  if (rawMembrane.length === 0 || rawSample.length === 0 || rawExp.length === 0) return null;
  const generation = Number(rawGeneration);
  if (!Number.isInteger(generation) || generation < 1) return null;
  let expiresAt: Date | null = null;
  if (rawExp !== '-') {
    const epoch = Number(rawExp);
    if (!Number.isInteger(epoch)) return null;
    expiresAt = new Date(epoch * 1000);
  }
  return {
    payload,
    signature,
    membraneId: decodeURIComponent(rawMembrane),
    generation,
    sampleId: decodeURIComponent(rawSample),
    expiresAt,
  };
}

/** Действующая запись мембраны; при `create` заводит первое поколение атомарно. */
async function currentRecord(
  deps: TrackKeyGeneratorDeps,
  membraneId: string,
  create: boolean,
): Promise<TrackKeySecretRecord | null> {
  const existing = await deps.keys.read(membraneId);
  if (existing) return existing;
  if (!create) return null;
  // Возвращаем то, что вернуло хранилище: при гонке победила чужая запись, и подписывать
  // надо ЕЮ, иначе ссылка родится мёртвой с ложным диагнозом `tampered`.
  return deps.keys.createIfAbsent({
    membraneId,
    generation: 1,
    secret: randomBytes(TRACK_KEY_SECRET_BYTES).toString('base64url'),
    rotatedAt: deps.now(),
  });
}

/**
 * Собрать адрес по ключу. Форма пути — предмет блока контракта (M2 сохранил внутренние пути
 * без слоя трансляции), поэтому здесь только приставка ключа, а база приходит параметром:
 * генератор не назначает соседям маршрут.
 */
export function buildTrackUrl(baseUrl: string, sampleId: string, key: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(sampleId)}/blob?k=${encodeURIComponent(key)}`;
}

export class TrackKeyGenerator {
  constructor(private readonly deps: TrackKeyGeneratorDeps) {}

  /**
   * Выдать ссылку на одну пробу. Срок берётся из настройки МЕМБРАНЫ; параметра набора нет —
   * приёмный лоток и именованные наборы неразличимы для выключателя по построению.
   */
  async issue(request: { membraneId: string | null | undefined; sampleId: string }): Promise<IssueOutcome> {
    if (request === null || typeof request !== 'object') {
      return { outcome: 'refused', verdict: 'malformed', why: 'запрос не объект' };
    }
    const extra = Object.keys(request).filter(
      (key) => !(ISSUE_REQUEST_KEYS as readonly string[]).includes(key),
    );
    if (extra.length > 0) {
      // Масштаб выключателя — мембрана. Лишний ключ в запросе (`collectionId`, `kind`, `ttl`)
      // это попытка завести вторую область управления сроком; отказ здесь и есть граница.
      return {
        outcome: 'refused',
        verdict: 'malformed',
        why: `срок мембранный: лишние поля запроса ${extra.join(', ')}`,
      };
    }
    if (!isFilledString(request.sampleId)) {
      return { outcome: 'refused', verdict: 'malformed', why: 'проба не названа' };
    }
    if (!isFilledString(request.membraneId)) {
      // Прибор без мембраны законен (M1), но ссылка без оси владения не выдаётся вовсе:
      // подстановка умолчания здесь была бы угадыванием владельца.
      return { outcome: 'refused', verdict: 'unknown_membrane', why: 'у прибора нет мембраны' };
    }

    const membraneId = request.membraneId;
    const now = this.deps.now();
    const ttl = resolveTrackKeyTtl(await this.deps.settings.read(membraneId), { now });
    const expiresAt = trackKeyExpiresAt(ttl, now);

    const record = await currentRecord(this.deps, membraneId, true);
    if (!record) return { outcome: 'refused', verdict: 'unknown_membrane', why: 'ключа мембраны нет' };

    const exp = expiresAt === null ? '-' : String(Math.floor(expiresAt.getTime() / 1000));
    const payload = encodePayload(membraneId, record.generation, request.sampleId, exp);
    const key = `${payload}.${sign(record.secret, payload)}`;

    return {
      outcome: 'issued',
      link: {
        membraneId,
        sampleId: request.sampleId,
        key,
        expiresAt: expiresAt === null ? null : expiresAt.toISOString(),
        generation: record.generation,
        ttl,
      },
    };
  }

  /** Проверить предъявленный ключ. Порядок: поколение → подпись → срок (см. шапку файла). */
  async verify(token: unknown): Promise<VerifyOutcome> {
    const parsed = parseToken(token);
    if (!parsed) return { verdict: 'malformed' };

    const record = await currentRecord(this.deps, parsed.membraneId, false);
    if (!record) return { verdict: 'unknown_membrane' };

    if (parsed.generation !== record.generation) return { verdict: 'stale_generation' };
    if (!signaturesEqual(parsed.signature, sign(record.secret, parsed.payload))) {
      return { verdict: 'tampered' };
    }
    if (parsed.expiresAt !== null && parsed.expiresAt.getTime() <= this.deps.now().getTime()) {
      return { verdict: 'expired' };
    }

    return {
      verdict: 'ok',
      membraneId: parsed.membraneId,
      sampleId: parsed.sampleId,
      generation: parsed.generation,
      expiresAt: parsed.expiresAt,
    };
  }

  /**
   * Сменить ключ мембраны. ЕДИНСТВЕННЫЙ механизм отзыва: гасит все выданные ссылки разом —
   * все наборы, все роды, приёмный лоток включительно, невыдохшие тоже.
   */
  async rotate(membraneId: string): Promise<RotateOutcome> {
    if (!isFilledString(membraneId)) {
      return { outcome: 'refused', verdict: 'unknown_membrane', why: 'мембрана не названа' };
    }
    const existing = await this.deps.keys.read(membraneId);
    const rotatedAt = this.deps.now();
    const next: TrackKeySecretRecord = {
      membraneId,
      generation: (existing?.generation ?? 0) + 1,
      secret: randomBytes(TRACK_KEY_SECRET_BYTES).toString('base64url'),
      rotatedAt,
    };
    await this.deps.keys.replace(next);
    return {
      outcome: 'rotated',
      membraneId,
      generation: next.generation,
      killedGeneration: existing?.generation ?? null,
      rotatedAt,
    };
  }
}
