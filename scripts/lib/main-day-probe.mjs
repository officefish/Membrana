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

/**
 * Отпечаток ПЕРВОИСТОЧНИКА свидетельства (консилиум `ritual-inputs-echo-and-extracts`).
 *
 * Эхо-камера 16.07: `detection-planning-priorities.mjs` (снимок от 06.07) подключён
 * к трём шагам ритуала — standup, plan:day, main-day-issue. Одна замороженная строка
 * прозвучала в таблице «Почему это магистраль» как три независимые галочки, и план
 * счёл это консенсусом. Единственный несогласный голос — вчерашний MAIN_DAY_ISSUE,
 * опиравшийся на факт мёржа, — оказался единственным правым и был отброшен.
 *
 * Диагноз Музыканта: это ровно коррелированность детекторов в ансамбле. yamnet
 * ценен не точностью, а тем, что ошибается НЕ ТАМ ЖЕ, где DSP (ND3). Источники,
 * производные от одного снимка, коррелированы полностью — их суммарный вес равен
 * весу ОДНОГО. Поэтому голоса считаются по различным первоисточникам, а не по
 * числу строк в таблице.
 *
 * Хэш намеренно НЕ криптографический: нужен стабильный дешёвый идентификатор
 * происхождения, а не защита от подделки. Формат `<источник>@<ревизия>`.
 *
 * @param {string} origin первоисточник, напр. 'detection-planning-priorities.mjs@2026-07-06'
 * @returns {string} 7-символьный short-hash
 */
export function originHash(origin) {
  const text = String(origin ?? '').trim();
  if (text === '') return '0000000';
  // FNV-1a 32-бит: детерминированный, без зависимостей, одинаковый вход → тот же хэш.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0').slice(0, 7);
}

/**
 * Схлопнуть свидетельства с общим первоисточником.
 *
 * Три отражения одного снимка — ОДИН голос, а не три. Порядок сохраняется:
 * первое вхождение выигрывает, остальные считаются отражениями.
 *
 * @param {readonly {origin?: string}[]} evidence
 * @returns {readonly ({origin?: string, originHash: string, reflections: number})[]}
 */
export function dedupeByOrigin(evidence) {
  /** @type {Map<string, any>} */
  const byOrigin = new Map();
  for (const item of evidence ?? []) {
    const hash = originHash(item?.origin);
    const seen = byOrigin.get(hash);
    if (seen) {
      seen.reflections += 1;
      continue;
    }
    byOrigin.set(hash, { ...item, originHash: hash, reflections: 1 });
  }
  return [...byOrigin.values()];
}

/**
 * Сколько НЕЗАВИСИМЫХ источников подтверждают магистраль.
 *
 * Считает различные первоисточники, а не строки: 16.07 три строки таблицы дали бы
 * `1`, и «консенсус» рассыпался бы до того, как план назначил работу.
 */
export function countIndependentSources(evidence) {
  return dedupeByOrigin(evidence).length;
}

/**
 * Строка о происхождении для таблицы «Почему это магистраль».
 *
 * Отражения помечаются ТЕКСТОМ («1 источник, N отражений»), а не только цветом:
 * требование Rodchenko — цвет не переживает пайп в файл и недоступен в a11y.
 */
export function formatOriginSummary(evidence) {
  const deduped = dedupeByOrigin(evidence);
  const total = (evidence ?? []).length;
  const independent = deduped.length;
  if (total === 0) return 'источников нет';
  const echoed = deduped.filter((d) => d.reflections > 1);
  const base = `магистраль подтверждена ${independent} независимыми источниками (строк в таблице: ${total})`;
  if (echoed.length === 0) return base;
  const detail = echoed
    .map((d) => `${d.origin ?? '—'} [${d.originHash}]: 1 источник, ${d.reflections} отражений`)
    .join('; ');
  return `${base}\nЭХО: ${detail}`;
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
