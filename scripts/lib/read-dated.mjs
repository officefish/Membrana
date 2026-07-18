/**
 * read-dated — ЕДИНСТВЕННАЯ дверь к датированным артефактам (узел F вердикта
 * scripts-boundary M0, спринт ritual-step-manifest-sf).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Гейт свежести обязан стоять на КАЖДОМ чтении, а
 * читателей ~20. Двадцать копий проверки — это двадцать мест, где её забудут
 * или разведут по-разному; ровно так дрейф-якоря стали украшением. Здесь один
 * вход: кто читает датированный артефакт — читает через `readDated`.
 *
 * `artifact-freshness.mjs` остаётся ЧИСТЫМ (без fs) — он про решение. Здесь fs
 * и вёрстка сообщений.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { explainStaleness, isFresh, parseProvenance } from './artifact-freshness.mjs';

/** @typedef {'ok'|'failed-critical'|'skipped-noncritical'} UpstreamStatus */

/**
 * Прочитать датированный артефакт ЧЕРЕЗ гейт свежести.
 *
 * Возвращает результат, а не бросает: решение «встать или идти дальше» принимает
 * вызывающий — у некритичных читателей (дайджест) оно иное, чем у критичных.
 * Молчаливого прохода нет ни в одной ветке: `stale` всегда несёт объяснение.
 *
 * @param {string} rel  путь от корня репозитория
 * @param {{
 *   today: string|Date,
 *   maxAgeDays?: number,
 *   upstreamStatus?: UpstreamStatus,
 *   root?: string,
 *   label?: string,
 * }} ctx  maxAgeDays — ожидаемый возраст ДЛЯ ЭТОГО РЕБРА (0 = сегодняшний;
 *         1 = допустим вчерашний, напр. утро читает ревью прошлого вечера)
 * @returns {{ok: boolean, content: string|null, why: string|null, provenance: ReturnType<typeof parseProvenance>|null}}
 */
export function readDated(rel, ctx) {
  const root = ctx?.root ?? process.cwd();
  const abs = resolve(root, rel);
  const label = ctx?.label ?? rel;

  if (!existsSync(abs)) {
    return { ok: false, content: null, provenance: null, why: `${label}: файла нет (${rel})` };
  }

  const content = readFileSync(abs, 'utf8');
  const provenance = parseProvenance(content);
  const artifact = { content };

  if (!isFresh(artifact, ctx)) {
    return { ok: false, content, provenance, why: explainStaleness(label, artifact, ctx) };
  }

  return { ok: true, content, provenance, why: null };
}

/**
 * Строгий вариант: несвежий вход = стоп с читаемым объяснением. Для КРИТИЧНЫХ
 * читателей, где работа на протухшем входе хуже, чем остановка.
 * @param {string} rel
 * @param {Parameters<typeof readDated>[1]} ctx
 * @returns {string} содержимое
 */
export function readDatedOrThrow(rel, ctx) {
  const res = readDated(rel, ctx);
  if (!res.ok) throw new Error(`Гейт свежести: ${res.why}`);
  return res.content;
}
