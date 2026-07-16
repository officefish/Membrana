/**
 * main-day-probe — проверка ПОСЫЛОК развилки MAIN_DAY_ISSUE (#533, корень 2).
 *
 * Повод (разбор `docs/seanses/main-day-issue-drift-report-2026-07-16.md`): 16.07,
 * в последний день перед дедлайном FREE, план назначил магистралью написать
 * `fuseDetectorConfidences` — функцию, слитую 13.07 и работавшую в проде. План
 * строил развилку на статусе «#415 open», а issue висел лишь потому, что PR #417
 * дал «(#415)» вместо «Closes #415». Ритуал читает статусы и доки, но никогда код.
 *
 * Решение консилиума `main-day-issue-accuracy-2026-07-16` (25 реплик, LGTM):
 * **маркер в коде первичен, Issue вторичен**. Расхождение (маркер есть, issue open)
 * — не шум, а НАХОДКА: реестр протух, и план обязан это подсветить.
 *
 * Ядро ЧИСТОЕ и ТОТАЛЬНОЕ: без I/O, без сети, без исключений. Сбор фактов — в
 * обвязке `scripts/main-day-probe.mjs`. Тот же раскрой, что у `drift-anchor-divergence`
 * (#413): чистый вердикт + тонкий скрипт.
 *
 * НЕ ЧИНИТ. Ядро только выносит вердикт: автопочинка (закрыть issue, править план)
 * скрыла бы находку, ради которой гейт и строится — консилиум запретил прямо.
 */

/**
 * Посылка плана. Формулируется всегда как «работы ещё нет»: развилка A/B
 * назначает работу именно на этом основании.
 *
 * @typedef {{
 *   claim: string,
 *   marker: { kind: 'symbol' | 'file' | 'test', value: string },
 *   issue?: number,
 * }} Assertion
 */

/**
 * Факты, собранные обвязкой. `null` — «не смогли узнать», а не «нет».
 *
 * @typedef {{
 *   markerExists: boolean | null,
 *   issueState?: 'open' | 'closed' | null,
 *   sha?: string,
 * }} ProbeEvidence
 */

/**
 * @typedef {{
 *   verdict: 'holds' | 'violated' | 'unknown',
 *   evidence: string,
 *   staleRegistry: boolean,
 * }} ProbeResult
 */

/** Человекочитаемое имя маркера для строки-доказательства. */
function markerLabel(marker) {
  const kind = marker?.kind ?? 'symbol';
  const value = marker?.value ?? '—';
  return `${kind}:${value}`;
}

/**
 * Вынести вердикт по одной посылке.
 *
 * Семантика намеренно асимметрична: посылка утверждает ОТСУТСТВИЕ работы, поэтому
 * найденный маркер её опровергает. Обратное неверно — отсутствие маркера не
 * доказывает, что работы нет (символ мог называться иначе), но это исходная
 * презумпция плана, и гейт её не оспаривает: он ловит ложное «ещё не сделано».
 *
 * @param {Assertion} assertion
 * @param {ProbeEvidence} evidence
 * @returns {ProbeResult}
 */
export function probeAssertion(assertion, evidence) {
  const marker = markerLabel(assertion?.marker);
  const exists = evidence?.markerExists ?? null;
  const issueState = evidence?.issueState ?? null;
  const at = evidence?.sha ? ` @${String(evidence.sha).slice(0, 12)}` : '';

  // Данных нет (нет gh, нет сети, дерево недоступно) — отсутствие данных НЕ алерт.
  // Эталон drift-anchor-divergence: «нет пары записей → exit 0 с честным „пары нет“».
  if (exists === null) {
    return {
      verdict: 'unknown',
      evidence: `${marker}: проверить не удалось (нет данных)${at}`,
      staleRegistry: false,
    };
  }

  if (exists === false) {
    return {
      verdict: 'holds',
      evidence: `${marker} отсутствует${at} — посылка подтверждена`,
      staleRegistry: false,
    };
  }

  // Маркер ЕСТЬ, а план утверждал обратное. Это и есть кейс 16.07.
  // Issue open поверх существующего маркера — вторая, самостоятельная находка:
  // реестр протух (PR не закрыл issue), и именно она увела план в ложную ветку.
  const staleRegistry = issueState === 'open';
  const issueNote =
    assertion?.issue !== undefined && issueState !== null
      ? `; issue #${assertion.issue} ${issueState}${staleRegistry ? ' — РЕЕСТР ПРОТУХ (код есть, issue открыт)' : ''}`
      : '';
  return {
    verdict: 'violated',
    evidence: `${marker} СУЩЕСТВУЕТ${at}${issueNote}`,
    staleRegistry,
  };
}

/**
 * Прогнать набор посылок.
 *
 * @param {readonly {assertion: Assertion, evidence: ProbeEvidence}[]} items
 * @returns {readonly (ProbeResult & { claim: string, marker: string })[]}
 */
export function probeAssertions(items) {
  return (items ?? []).map((item) => ({
    claim: item?.assertion?.claim ?? '—',
    marker: markerLabel(item?.assertion?.marker),
    ...probeAssertion(item?.assertion, item?.evidence),
  }));
}

/** Есть ли хоть одна нарушенная посылка — основание уронить генерацию плана. */
export function hasViolatedAssertion(results) {
  return (results ?? []).some((r) => r?.verdict === 'violated');
}

const VERDICT_ORDER = { violated: 0, unknown: 1, holds: 2 };

/**
 * Отчёт «посылка → маркер → вердикт».
 *
 * Нарушенные — СВЕРХУ, помечены ТЕКСТОМ «ПОСЫЛКА НАРУШЕНА», а не только цветом:
 * требование Rodchenko (a11y + grep — цвет не переживает пайп в файл).
 *
 * @param {readonly (ProbeResult & { claim: string, marker: string })[]} results
 * @returns {string}
 */
export function formatProbeReport(results) {
  const rows = [...(results ?? [])].sort(
    (a, b) => (VERDICT_ORDER[a?.verdict] ?? 3) - (VERDICT_ORDER[b?.verdict] ?? 3),
  );
  if (rows.length === 0) return 'Посылок для проверки нет.';
  const lines = ['| Вердикт | Посылка | Доказательство |', '| --- | --- | --- |'];
  for (const row of rows) {
    const label =
      row.verdict === 'violated'
        ? 'ПОСЫЛКА НАРУШЕНА'
        : row.verdict === 'unknown'
          ? 'НЕ ПРОВЕРЕНА'
          : 'подтверждена';
    lines.push(`| ${label} | ${row.claim} | ${row.evidence} |`);
  }
  return lines.join('\n');
}
