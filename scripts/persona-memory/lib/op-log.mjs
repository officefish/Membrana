/**
 * op-log — эмиттер журнала операций второго контура памяти (P4; вердикт C5
 * memory-subconscious, ратифицирован 28.07; сшивка — MEETING_VERDICT.md).
 *
 * Запись: {ts, persona, verb, ref?, reason?, origin?} — append-only jsonl в доме
 * HOMES.opLog (path-схема C1/C5 из archive-schema.mjs; путь здесь не дублируется).
 *
 * Словарь глаголов ЗАКРЫТ (ровно 10, вердикт C5): чужой verb — throw, не warn.
 * Best-effort запрещён: сбой записи — громкая ошибка, не проглоченный catch
 * (op-log — source of truth для token 121 и отчёта памяти; молчаливая потеря
 * события = подделка метрик следующим шагом).
 *
 * Межа сшивки №3: таблица verb→emitter (C5) — accept-тест фаз стройки, НЕ
 * основание расширять словарь или лезть в extractor/цепочки. Новые verb —
 * только обновлением словаря C5 (ребро C5→C6).
 * Межа сшивки №2: причина transfer живёт ЗДЕСЬ (reason события), не в
 * ArchiveRecord; класс перетока — полем class события transfer_to_archive.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { HOMES } from './archive-schema.mjs';

/** Закрытый словарь глаголов op-log (вердикт C5, ровно 10). */
export const OP_VERBS = Object.freeze([
  'write_operational',
  'transfer_to_archive',
  'rebuild_report',
  'cloud_query',
  'emerge',
  'reject',
  'surface_invoke',
  'evening_compress',
  'morning_warmup',
  'receipt_close',
]);

/** Home журнала per persona×date — из path-схемы каркаса (не дублировать). */
export function opLogRel(persona, date) {
  return HOMES.opLog(persona, date);
}

/**
 * Собрать запись журнала. Чужой глагол — throw (словарь закрыт).
 * Лишние поля входа не протекают: схема записи — ровно шесть имён C5
 * (+ class для transfer_to_archive, межа №2).
 * @param {{ts?: string, persona: string, verb: string, ref?: string, reason?: string, origin?: string, class?: string}} input
 */
export function buildOpEntry(input) {
  const { persona, verb } = input ?? {};
  if (!persona || typeof persona !== 'string') {
    throw new Error('op-log: persona обязательна — событие без владельца не журналируется');
  }
  if (!OP_VERBS.includes(verb)) {
    throw new Error(
      `op-log: глагол «${verb}» вне закрытого словаря C5 (${OP_VERBS.join(', ')}). ` +
        'Расширение — только обновлением словаря C5 (межа сшивки №3), не записью мимо.',
    );
  }
  const entry = { ts: input.ts ?? new Date().toISOString(), persona, verb };
  if (input.ref != null) entry.ref = String(input.ref);
  if (input.reason != null) entry.reason = String(input.reason);
  if (input.origin != null) entry.origin = String(input.origin);
  if (verb === 'transfer_to_archive' && input.class != null) entry.class = String(input.class);
  return entry;
}

/**
 * Записать событие (append-only). Сбой ФС — throw: best-effort запрещён (C5).
 * @param {string} repoRoot
 * @param {Parameters<typeof buildOpEntry>[0]} input
 * @returns {{entry: object, rel: string}}
 */
export function emitOp(repoRoot, input) {
  const entry = buildOpEntry(input);
  const rel = opLogRel(entry.persona, String(entry.ts).slice(0, 10));
  const abs = join(repoRoot, rel);
  mkdirSync(dirname(abs), { recursive: true });
  appendFileSync(abs, JSON.stringify(entry) + '\n', 'utf8');
  return { entry, rel };
}

/**
 * Разбор журнала: строка = событие; битая строка — находка с номером, не пропуск.
 * @param {string} text
 * @returns {{events: object[], broken: number[]}}
 */
export function parseOpLog(text) {
  const events = [];
  const broken = [];
  String(text ?? '').split(/\r?\n/u).forEach((line, i) => {
    if (!line.trim()) return;
    try {
      events.push(JSON.parse(line));
    } catch {
      broken.push(i + 1);
    }
  });
  return { events, broken };
}
