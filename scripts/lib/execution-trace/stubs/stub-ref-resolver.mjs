/**
 * СТАБ разрешения `ref` — без сети, без `git`, без `gh`.
 *
 * «Вещдок без адреса — не вещдок» (`scripts/lib/evidence-index.mjs`): адресуемость — один из
 * трёх критериев приёма рода следа. Но РАЗРЕШЕНИЕ адреса — инъектируемая операция: в проде это
 * файл/запись, здесь — детерминированная проверка по замороженному снимку. Зубы гоняются на
 * снимке, поэтому вердикт не зависит ни от сети, ни от состояния рабочего дерева.
 */

/** Замороженный снимок «существующих» адресов для фикстур Phase 2. */
export const DEFAULT_SNAPSHOT = Object.freeze([
  'docs/audit/llm-calls/2026-07-30-kuryokhin-mfcc.json',
  'docs/audit/llm-calls/2026-07-30-kuryokhin-second.json',
  'docs/audit/llm-calls/2026-07-30-vesnin-gate.json',
  'docs/audit/llm-calls/2026-07-30-rodchenko-gate.json',
  'docs/seanses/sprint-honest-m2-contract-2026-07-30.md',
  'docs/seanses/sprint-honest-m3-contract-review-2026-07-30.md',
  'docs/reviews/mfcc-core-teamlead.md',
  'docs/reviews/gate-wiring-teamlead.md',
]);

/**
 * @param {readonly string[]} snapshot
 * @returns {(ref: string) => boolean}
 */
export function makeSnapshotResolver(snapshot = DEFAULT_SNAPSHOT) {
  const set = new Set(snapshot);
  return (ref) => set.has(ref);
}
