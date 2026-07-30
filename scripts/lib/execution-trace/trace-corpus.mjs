/**
 * Разбор ЛЕНТЫ ВЕЩДОКОВ окна (M4) в нормализованные следы.
 *
 * Единственный источник факта исполнения — лента. Участие НЕ выводится из карточки
 * реестра, зоны кода, ветки, авторства коммита и presence (запрет M1): обезличенные
 * каналы авторства уязвимы к сборке чужой рукой (инцидент 19.07).
 *
 * Без `fs`, без сети, без `git`/`gh`, без `Date.now()` — на вход приходят уже разобранные записи.
 */

import { INPUT_ERRORS } from './gate-exit-codes.mjs';
import { parseIso } from './plan-reader.mjs';
import { isKnownTraceKind } from './trace-kinds.mjs';

const REQUIRED = Object.freeze(['traceId', 'blockId', 'kind', 'subject', 'at', 'ref']);

/**
 * @typedef {object} NormalizedTrace
 * @property {string} traceId
 * @property {string} blockId
 * @property {string} kind
 * @property {string} subject          personaId, кто произвёл акт
 * @property {number} at               epoch ms; владелец метки — САМ СЛЕД
 * @property {string} ref              разрешимая ссылка: вещдок без адреса — не вещдок
 * @property {boolean} relatesToSprint явная связь со спринтом (для позднего закрытия)
 */

/**
 * @param {readonly unknown[]} records
 * @param {{ knownPersonas: readonly string[] }} ctx
 * @returns {{ traces: NormalizedTrace[], errors: {code:string,subject:string,detail:string}[] }}
 */
export function readTraceCorpus(records, ctx) {
  /** @type {{code:string,subject:string,detail:string}[]} */
  const errors = [];
  /** @type {NormalizedTrace[]} */
  const traces = [];
  const err = (code, subject, detail) => errors.push({ code, subject, detail });

  records.forEach((r, i) => {
    const rec = /** @type {Record<string, any>} */ (r && typeof r === 'object' ? r : {});
    const id = typeof rec.traceId === 'string' && rec.traceId !== '' ? rec.traceId : `#${i + 1}`;

    const missing = REQUIRED.filter((f) => rec[f] === undefined || rec[f] === null || rec[f] === '');
    if (missing.length > 0) {
      err(INPUT_ERRORS.E_TRACE_FIELDS_MISSING, id, `нет полей: ${missing.join(', ')}`);
      return;
    }
    if (!isKnownTraceKind(rec.kind)) {
      // Пятый род — ошибка входа, а не «прочее»: иначе гейт обходится новым словом.
      err(INPUT_ERRORS.E_TRACE_KIND_UNKNOWN, id, `kind=${String(rec.kind)} вне закрытых четырёх`);
      return;
    }
    const at = parseIso(rec.at);
    if (at === null) {
      err(INPUT_ERRORS.E_TRACE_TIME_INVALID, id, `at=${String(rec.at)} не ISO-8601`);
      return;
    }
    if (!ctx.knownPersonas.includes(rec.subject)) {
      err(INPUT_ERRORS.E_PERSONA_UNKNOWN, id, `subject=${String(rec.subject)} вне voices.registry.json`);
      return;
    }
    traces.push({
      traceId: String(rec.traceId),
      blockId: String(rec.blockId),
      kind: String(rec.kind),
      subject: String(rec.subject),
      at,
      ref: String(rec.ref),
      relatesToSprint: rec.relatesToSprint === true,
    });
  });

  return { traces, errors };
}

/**
 * Разбор JSONL-ленты в записи. Пустые строки и строки-комментарии (`#`) игнорируются:
 * это форма файла, а не содержание ленты.
 * @param {string} text
 * @returns {{ records: unknown[], errors: {code:string,subject:string,detail:string}[] }}
 */
export function parseJsonl(text) {
  /** @type {unknown[]} */
  const records = [];
  /** @type {{code:string,subject:string,detail:string}[]} */
  const errors = [];
  text.split(/\r?\n/u).forEach((line, i) => {
    const s = line.trim();
    if (s === '' || s.startsWith('#')) return;
    try {
      records.push(JSON.parse(s));
    } catch {
      errors.push({
        code: INPUT_ERRORS.E_TRACE_FIELDS_MISSING,
        subject: `строка ${i + 1}`,
        detail: 'не разбирается как JSON',
      });
    }
  });
  return { records, errors };
}
