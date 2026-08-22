/**
 * Задание плагину журнала и его проверка ДО вызова — блок C коворка `cowork-server-plugin-pages`.
 *
 * ЗАЧЕМ ПРОВЕРКА ЖИВЁТ В МОДУЛЕ, А НЕ В ПЛАГИНЕ. Реплика Курёхина в шторме 22.08 (кандидат К8):
 * если модуль принимает любое задание и молча зовёт плагин, оператор крутит ручку мёртвого
 * регулятора — экран отвечает, а смысла за ответом нет. Модуль обязан уметь сказать «нет» с
 * причиной прежде, чем плагин вообще начнёт работу.
 *
 * ЧТО ИМЕННО ПРОВЕРЯЕТСЯ. Только то, о чём модуль знает БОЛЬШЕ плагина: существует ли адресуемая
 * запись в ленте, того ли она рода, принадлежит ли она этому пользователю, есть ли у неё то, что
 * плагин просит (звук — не у всякой записи; у отчёта его нет вовсе). Предметные проверки самого
 * плагина — не здесь: модуль не знает, что плагин считает годным входом.
 *
 * ОТКАЗ — ИМЕНЕМ ИЗ ЗАКРЫТОГО СПИСКА, а не строкой и не броском: список отказов и есть контракт
 * модуля перед плагином, и он должен читаться, а не угадываться по тексту.
 */
import type { LiveJournalItemRow } from '../live-journal-items.mapper';

/** Что плагин просит у журнала. Закрытый список: чего нет в нём — того модуль не обещает. */
export type JournalTaskNeed =
  /** Нужны сами записи ленты — заголовки, метки, время. */
  | 'entries'
  /** Нужен звук записи. У журнала его НЕТ: он живёт в media, см. MODULE_INTERFACE.md. */
  | 'audio';

export interface JournalTask {
  /** Адреса записей ленты, по которым плагин просит работу. Пустой список — не задание. */
  readonly entryIds: readonly string[];
  readonly needs: readonly JournalTaskNeed[];
}

/** Причины отказа — закрытый список; каждая говорит, ЧТО не так, а не «неверный запрос». */
export type JournalTaskRefusalReason =
  | 'empty-task'
  | 'entry-not-found'
  | 'audio-not-here';

export interface JournalTaskRefusal {
  readonly ok: false;
  readonly reason: JournalTaskRefusalReason;
  readonly detail: string;
}

export interface JournalTaskAccepted {
  readonly ok: true;
  /** Записи, к которым задание относится — уже найденные, чтобы плагин не искал повторно. */
  readonly entries: readonly LiveJournalItemRow[];
}

export type JournalTaskVerdict = JournalTaskAccepted | JournalTaskRefusal;

const refuse = (reason: JournalTaskRefusalReason, detail: string): JournalTaskRefusal => ({
  ok: false,
  reason,
  detail,
});

/**
 * Проверить задание до вызова плагина.
 *
 * `available` — записи, которые модуль реально отдаёт этому пользователю: проверка идёт по ним,
 * а не по базе целиком, потому что «нет такой записи» и «есть, но не твоя» для отвечающего
 * модуля — один и тот же отказ, и различать их наружу значило бы рассказывать о чужих данных.
 */
export function verifyJournalTask(
  task: JournalTask,
  available: readonly LiveJournalItemRow[],
): JournalTaskVerdict {
  if (task.entryIds.length === 0) {
    return refuse('empty-task', 'в задании ноль адресов записей — плагину не над чем работать');
  }

  const byId = new Map(available.map((row) => [row.id, row]));
  const missing = task.entryIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return refuse(
      'entry-not-found',
      `записей нет в ленте пользователя: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` и ещё ${missing.length - 3}` : ''}`,
    );
  }

  const entries = task.entryIds.map((id) => byId.get(id)!);

  if (task.needs.includes('audio')) {
    // Звука у журнала нет ни у одной записи — ни у трека, ни у отчёта: лента несёт ССЫЛКИ.
    // Отказ здесь честнее, чем отдать плагину пустой буфер и дать ему решить, что тишина.
    return refuse(
      'audio-not-here',
      'журнал звука не хранит: лента несёт ссылки, блоб живёт в media и берётся по (deviceId, sampleId)',
    );
  }

  // Род записей отказом НЕ является: задание из одних отчётов законно, если плагин их и просит.
  // Модуль о составе говорит отдельно (`taskKinds`), а не прячет его в вердикт.
  return { ok: true, entries };
}

/**
 * Род записей задания — то, о чём модуль обязан сказать плагину заранее.
 * Не отказ: смесь родов законна; но плагин, ждущий только треков, должен видеть смесь ДО работы.
 */
export function taskKinds(entries: readonly LiveJournalItemRow[]): {
  tracks: number;
  reports: number;
} {
  return {
    tracks: entries.filter((e) => e.kind === 'track').length,
    reports: entries.filter((e) => e.kind === 'report').length,
  };
}
