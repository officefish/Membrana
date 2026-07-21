/**
 * Сборка канона дня КОДОМ (вердикт M2-B заседания angelina-hostess, 21.07).
 *
 * Стенка Slot → Text доведена до сборки: `frame()` владеет секциями (id/order/title),
 * LLM зовётся ТОЛЬКО per-slot через контракт `fill(slot, ctx) → {text, status}`,
 * `assemble()` конкатенирует заголовки из frame + тела из fill. Единый промпт-скелет
 * запрещён — модели физически нечего ронять.
 *
 * Пять слотов плана (спека владельца 20.07) + служебная секция «Список посылок»
 * (probe-посылки живут в структуре, а не по памяти) — секция кода, не слот LLM.
 *
 * Чистое ядро: без сети/fs; LLM и диск — у вызывающего.
 */

import { createHash } from 'node:crypto';
import { frame } from './day-plan-frame.mjs';

/** Статусы наполнения слота. Пустой/битый — легальное ВИДИМОЕ состояние, не отказ. */
export const FILL_STATUS = Object.freeze({ FILLED: 'filled', EMPTY: 'empty', MALFORMED: 'malformed' });

/** Заголовок служебной секции посылок — код, не LLM. */
export const PREMISES_TITLE = 'Список посылок';

/**
 * Нормализация результата fill: не-строка/пустота → empty; строка с содержимым → filled.
 * Вызывающий может передать status сам (malformed при ошибке разбора).
 * @param {{text?: unknown, status?: string}|null|undefined} raw
 * @returns {{text: string, status: string}}
 */
export function normalizeFill(raw) {
  const status = raw?.status && Object.values(FILL_STATUS).includes(raw.status) ? raw.status : null;
  const text = typeof raw?.text === 'string' ? raw.text.trim() : '';
  if (status) return { text, status };
  return text ? { text, status: FILL_STATUS.FILLED } : { text: '', status: FILL_STATUS.EMPTY };
}

/**
 * Тотальная сборка: ВСЕГДА 5 секций плана (заголовки из frame) + секция посылок.
 * Пустой/битый слот → видимый маркер с текстом (для скринридера — словами), в хвосте —
 * сводка «слотов пусто: N». Ничего не роняется и не прячется.
 * @param {Record<string, {text?: string, status?: string}>} fills слот-id → результат fill
 * @param {{premises?: string[]}} [opts] probe-посылки дня (код, не LLM)
 * @returns {{markdown: string, emptyCount: number, statuses: Record<string, string>}}
 */
export function assemble(fills, opts = {}) {
  const parts = [];
  const statuses = {};
  let emptyCount = 0;

  for (const slot of frame()) {
    const f = normalizeFill(fills?.[slot.id]);
    statuses[slot.id] = f.status;
    parts.push(`## ${slot.title}`);
    if (f.status === FILL_STATUS.FILLED) {
      parts.push(f.text);
    } else {
      emptyCount += 1;
      parts.push(
        f.status === FILL_STATUS.MALFORMED
          ? '⚠ слот битый: наполнение не разобралось (malformed)'
          : '⚠ слот пуст: наполнение не удалось',
      );
    }
    parts.push('');
  }

  // Служебная секция посылок — эмитится кодом всегда (даже пустая — явно).
  parts.push(`## ${PREMISES_TITLE}`);
  const premises = (opts.premises ?? []).filter((p) => typeof p === 'string' && p.trim());
  if (premises.length > 0) for (const p of premises) parts.push(`- ${p.trim()}`);
  else parts.push('- посылок probe на сегодня нет (развилки не обнаружены)');
  parts.push('');

  parts.push(`_слотов пусто/бито: ${emptyCount} из ${frame().length}_`);
  return { markdown: parts.join('\n'), emptyCount, statuses };
}

/** Канонизация для подписи: нормализованные переводы строк, обрезанный хвост. */
export function canonicalize(doc) {
  return String(doc ?? '').replace(/\r\n/g, '\n').trimEnd();
}

/** Разрешённые авторы канона (M2-B: author фиксируется на входе прогона). */
export const CANON_AUTHORS = Object.freeze(['llm', 'human']);

/**
 * Подпись канона: {digest, author, signedAt}. `author=human` — легитимная ручная
 * чеканка; страж проверяет структуру и целостность, НЕ авторство.
 * @param {string} doc
 * @param {'llm'|'human'} author
 * @param {{signedAt?: string}} [opts] время подаётся снаружи (детерминизм тестов)
 * @returns {{digest: string, author: string, signedAt: string|null}}
 */
export function sign(doc, author, opts = {}) {
  if (!CANON_AUTHORS.includes(author)) {
    throw new Error(`автор «${author}» ∉ {llm, human} — фиксируется на входе прогона`);
  }
  return {
    digest: createHash('sha256').update(canonicalize(doc)).digest('hex'),
    author,
    signedAt: opts.signedAt ?? null,
  };
}

/**
 * Страж целостности подписи: digest совпадает с документом. Авторство не судится.
 * @param {string} doc
 * @param {{digest?: string}} signature
 * @returns {boolean}
 */
export function digestOk(doc, signature) {
  return Boolean(signature?.digest) &&
    createHash('sha256').update(canonicalize(doc)).digest('hex') === signature.digest;
}
