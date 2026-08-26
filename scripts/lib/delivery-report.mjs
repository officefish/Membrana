/**
 * Зуб #2147/№3: норма «доверяй стволу, не пайпу» → машинный предикат.
 *
 * Класс повторов (22.08, дважды 24.08): «запушено»/«влит» докладывались по
 * exit-коду обёртки; ствол не подтверждал. Теперь доклад сессии о доставке
 * принимается только со свидетельством ствола: строкой
 *   `итог: PR #N state=MERGED mergeCommit=<sha>` (её печатает pr:ship финалом,
 *   зуб #2147/№2, PR #2152) — либо сырым выводом
 *   `gh pr view <N> --json state,mergeCommit` с MERGED и oid рядом.
 *
 * Чистые функции — их гоняет CI (test:scripts); CLI-обёртка ведущей —
 * scripts/delivery-report-check.mjs (yarn report:delivery-check).
 */

/** Строка-свидетельство pr:ship (зуб №2): номер, состояние, срез mergeCommit. */
export const SHIP_EVIDENCE_RE = /итог: PR #(\d+) state=([A-Z_]+)(?: mergeCommit=([0-9a-f]{8,40}))?/gu;

/** Сырой глагол сверки; результат ищется в окне следующих строк. */
export const GH_VIEW_RE = /gh pr view (\d+) --json state,mergeCommit/u;

/** Слова заявки о доставке. Свидетельственные строки заявкой не считаются. */
const CLAIM_WORD_RE = /влит|смёржен|доставлен|merged/iu;

const GH_RESULT_WINDOW = 6;

/**
 * Свидетельства ствола из текста доклада: PR → {state, mergeCommit|null}.
 * @param {string} text
 */
export function collectTrunkEvidence(text) {
  /** @type {Map<number, {state: string, mergeCommit: string|null}>} */
  const evidence = new Map();
  for (const m of text.matchAll(SHIP_EVIDENCE_RE)) {
    evidence.set(Number(m[1]), { state: m[2], mergeCommit: m[3] ?? null });
  }
  const lines = text.split(/\r?\n/u);
  for (let i = 0; i < lines.length; i += 1) {
    const gh = GH_VIEW_RE.exec(lines[i]);
    if (!gh) continue;
    const n = Number(gh[1]);
    if (evidence.has(n)) continue;
    const window = lines.slice(i + 1, i + 1 + GH_RESULT_WINDOW).join('\n');
    const state = /"?state"?[":= ]+"?([A-Z_]+)"?/u.exec(window)?.[1] ?? null;
    const oid = /\b([0-9a-f]{8,40})\b/u.exec(window)?.[1] ?? null;
    if (state) evidence.set(n, { state, mergeCommit: oid });
  }
  return evidence;
}

/**
 * Заявленные доставленными PR: номера из строк со словами заявки
 * (свидетельственные строки `итог:` исключены — они не заявка, а подтверждение).
 * @param {string} text
 */
export function extractDeliveryClaims(text) {
  const claims = new Set();
  for (const line of text.split(/\r?\n/u)) {
    if (/^\s*итог: PR #/u.test(line)) continue;
    if (!CLAIM_WORD_RE.test(line)) continue;
    // Боевой ложный позитив №2 (26.08): «**1. #2181 — находка.** Влит PR #2189» — в строке
    // ДВА номера, и задача #2181 читалась как недоставленный PR. Правило: если в строке PR
    // назван явно («PR #N»), заявкой считаются ТОЛЬКО такие номера, а голые #N рядом —
    // контекст (issue, задача, пункт). Голый номер остаётся заявкой лишь когда явного нет:
    // иначе «влит #2152» перестало бы ловиться, а это ослабило бы зуб.
    const explicit = [...line.matchAll(/PR ?#(\d{2,6})\b/gu)].map((m) => Number(m[1]));
    if (explicit.length > 0) {
      for (const n of explicit) claims.add(n);
      continue;
    }
    for (const m of line.matchAll(/(\p{L}+[  ])?(?:PR ?)?#(\d{2,6})\b/gu)) {
      // Живой ложный позитив 25.08: «пять зубов #2147 доставлены» — номер ISSUE в
      // строке с заявкой. Ссылки на не-PR сущности (issue/зуб/строка/эпик/задача)
      // заявкой о доставке PR не являются.
      const prev = (m[1] ?? '').trim().toLowerCase();
      if (/^(issue|зуб(?:ов|а|ы)?|строк[аи]|таблиц[аы]|эпик[а-я]*|задач[а-я]*|карточк[а-я]*)$/u.test(prev)) continue;
      claims.add(Number(m[2]));
    }
  }
  return [...claims].sort((a, b) => a - b);
}

/**
 * Предикат приёмки: каждая заявка о доставке подтверждена стволом.
 * @param {string} text
 * @returns {string[]} проблемы; пусто = доклад принимается
 */
export function deliveryReportProblems(text) {
  const problems = [];
  const evidence = collectTrunkEvidence(text);
  for (const n of extractDeliveryClaims(text)) {
    const e = evidence.get(n);
    if (!e) {
      problems.push(
        `PR #${n} заявлен доставленным БЕЗ свидетельства ствола — приложи строку «итог: PR #${n} state=MERGED mergeCommit=…» (печатает pr:ship) или вывод gh pr view ${n} --json state,mergeCommit`,
      );
      continue;
    }
    if (e.state !== 'MERGED') {
      problems.push(`PR #${n}: свидетельство говорит state=${e.state}, а не MERGED — доклад расходится со стволом`);
      continue;
    }
    if (!e.mergeCommit) {
      problems.push(`PR #${n}: MERGED без mergeCommit — срез коммита обязателен (отличает мердж от закрытия)`);
    }
  }
  return problems;
}
