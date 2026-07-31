/**
 * Признак жизни нормы порядка обращения к инструменту (§8 контракта `workshop-wires`).
 *
 * Норма живёт в `AGENTS.md` и **не подпирается зубом**: невызов инструмента машине в момент
 * нарушения не виден — гейт ловил бы вызовы, а нарушение есть их отсутствие. Подпорка —
 * разбор транскриптов постфактум, исход — **находка, а не блок**.
 *
 * ДВА ПОРОГА, ОБА ОБЯЗАТЕЛЬНЫ:
 *
 * ```text
 * доля сессий, начатых разведочным поиском      ≤ 0.2
 * доля сессий хотя бы с одним вызовом мастерской ≥ 0.5
 * ```
 *
 * Почему двойной, а не один. Первый порог ловит «полез грепать вместо инструмента», второй —
 * «инструмент не позван вообще». По отдельности каждый обходится: сессия, не сделавшая
 * НИЧЕГО, проходит первый порог идеально; сессия, позвавшая мастерскую один раз в конце
 * после часа грепа, проходит второй.
 *
 * МАЛАЯ ВЫБОРКА — НЕ ЗЕЛЁНЫЙ. Меньше пяти сессий в окне даёт честное «выборки недостаточно»
 * с числом. Посчитать долю по трём сессиям и напечатать «0% нарушений» значит выдать шум за
 * признак жизни — ровно то, против чего вердикт M7 и оговорился.
 *
 * ПЛАКАТ ПРИЗНАКОМ ЖИЗНИ НЕ ЯВЛЯЕТСЯ. Наличие строки в `AGENTS.md` этой меркой не проверяется
 * и проверяться не может; здесь считается поведение, а не текст.
 */

/** Окно наблюдения — 28 дней. То же, что у срока освобождения (§5): два разных «долгих окна» в одном контуре породили бы спор, какое настоящее. */
export const WINDOW_DAYS = 28;

/** Минимум сессий, ниже которого доля не печатается. */
export const MIN_SESSIONS = 5;

/** Порог доли сессий, начатых разведкой. */
export const MAX_SEARCH_FIRST_RATE = 0.2;

/** Порог доли сессий хотя бы с одним вызовом мастерской. */
export const MIN_WORKSHOP_RATE = 0.5;

/** Исходы мерки. Список ЗАКРЫТ: третьего «почти» нет. */
export const LIVENESS_VERDICTS = Object.freeze({
  ALIVE: 'alive',
  VIOLATED: 'violated',
  INSUFFICIENT: 'insufficient',
});

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Посчитать признак жизни по сессиям.
 *
 * `now` приходит параметром: мерка, зовущая часы внутри, меняет вердикт от минуты прогона.
 *
 * @param {readonly {sessionId: string, at: number, signals: object}[]} sessions
 * @param {{now: number, windowDays?: number}} opts
 */
export function normLiveness(sessions, opts) {
  const windowDays = opts?.windowDays ?? WINDOW_DAYS;
  const now = opts?.now;
  if (!Number.isFinite(now)) {
    return { verdict: LIVENESS_VERDICTS.INSUFFICIENT, reason: 'момент проверки не назван', inWindow: 0, considered: 0 };
  }
  const from = now - windowDays * DAY_MS;
  const inWindow = (sessions ?? []).filter((s) => s.at >= from && s.at <= now);

  // В предикат входят только сессии, где БЫЛ содержательный ход. Сессия без единого
  // поискового или мастерского вызова ничего не говорит о порядке обращения, и держать её
  // в знаменателе значит разбавлять обе доли молчанием.
  const considered = inWindow.filter((s) => s.signals?.firstActionWasSearch !== null);

  if (considered.length < MIN_SESSIONS) {
    return {
      verdict: LIVENESS_VERDICTS.INSUFFICIENT,
      reason: `выборки недостаточно: содержательных сессий ${considered.length} из ${inWindow.length} в окне, порог ${MIN_SESSIONS}`,
      inWindow: inWindow.length,
      considered: considered.length,
    };
  }

  const searchFirst = considered.filter((s) => s.signals.firstActionWasSearch === true).length;
  const withWorkshop = considered.filter((s) => s.signals.hasWorkshopCall === true).length;
  const searchFirstRate = searchFirst / considered.length;
  const workshopRate = withWorkshop / considered.length;

  const failures = [];
  if (searchFirstRate > MAX_SEARCH_FIRST_RATE) {
    failures.push(`доля сессий, начатых разведкой, ${fmt(searchFirstRate)} — выше порога ${fmt(MAX_SEARCH_FIRST_RATE)}`);
  }
  if (workshopRate < MIN_WORKSHOP_RATE) {
    failures.push(`доля сессий с вызовом мастерской ${fmt(workshopRate)} — ниже порога ${fmt(MIN_WORKSHOP_RATE)}`);
  }

  return {
    verdict: failures.length === 0 ? LIVENESS_VERDICTS.ALIVE : LIVENESS_VERDICTS.VIOLATED,
    reason: failures.join(' · '),
    inWindow: inWindow.length,
    considered: considered.length,
    searchFirst,
    withWorkshop,
    searchFirstRate,
    workshopRate,
    failures,
  };
}

/** Доля человеку: проценты с одним знаком. */
function fmt(x) {
  return `${(x * 100).toFixed(1)}%`;
}

/**
 * Отчёт словами.
 *
 * При недостаточной выборке процент НЕ печатается вовсе. Напечатать его с оговоркой мелким
 * шрифтом — то же самое, что напечатать без оговорки: читатель запомнит число.
 */
export function renderLiveness(result) {
  const head = `норма §8 · окно ${WINDOW_DAYS} дней · сессий в окне ${result.inWindow}, содержательных ${result.considered}`;
  if (result.verdict === LIVENESS_VERDICTS.INSUFFICIENT) {
    return `${head}\n  ? ${result.reason} — процент не печатается: признака жизни нет, но и нарушения не заявлено`;
  }
  const rates = `начаты разведкой ${fmt(result.searchFirstRate)} (порог ≤ ${fmt(MAX_SEARCH_FIRST_RATE)}) · с вызовом мастерской ${fmt(result.workshopRate)} (порог ≥ ${fmt(MIN_WORKSHOP_RATE)})`;
  if (result.verdict === LIVENESS_VERDICTS.ALIVE) return `${head}\n  ✓ норма жива: ${rates}`;
  return `${head}\n  ✖ норма нарушена: ${result.failures.join(' · ')}\n  ${rates}\n  Это НАХОДКА, не блок: разбор постфактум ничего не останавливает.`;
}
