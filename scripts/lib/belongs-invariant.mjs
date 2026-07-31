/**
 * Инвариант принадлежности — двухфазный предикат §5 контракта `workshop-wires` (комната M4).
 *
 * ```text
 * фаза 1, рабочая:  I_growth ⇔ O(t) \ B \ W = ∅   — прирост бесхозного отсутствует
 * фаза 2:           I_abs    ⇔ O(t) \ W = ∅       — бесхозных нет вовсе
 * ```
 *
 * `O(t)` — текущее множество `orphan`; `B` — baseline, замороженный в момент включения;
 * `W` — действующие освобождения ([`orphan-waiver`](./orphan-waiver.mjs)).
 *
 * ПОЧЕМУ НЕ ДОЛЯ И НЕ ПОРОГ. Порог вида «сирот не больше N процентов» проходит зелёным на
 * растущем репозитории: знаменатель пухнет быстрее числителя, и метрика улучшается сама,
 * пока новых сирот прибывает каждый день. Прирост же ловит именно то, что добавили сегодня.
 *
 * НАСЛЕДСТВО НЕ БЛОКИРУЕТ. 476 носителей были сиротами на замер 30.07 — блокировать пуш из-за
 * них значит требовать разгрести полгода накопленного, чтобы поправить опечатку. Наследство
 * видно счётчиком и не мешает; мешает только прирост.
 *
 * `I_abs` ВКЛЮЧАЕТСЯ ТОЛЬКО СЛОВОМ ВЛАДЕЛЬЦА — не по календарю, не по достижении нуля и не
 * «раз наследство почти кончилось». Автоматический переход означал бы, что зуб однажды
 * ужесточится сам, без чьего-либо решения, — и первым об этом узнает тот, у кого упадёт пуш.
 */
import { activeWaiverPaths } from './orphan-waiver.mjs';

/** Фазы инварианта. Список ЗАКРЫТ. */
export const INVARIANT_PHASES = Object.freeze({ GROWTH: 'growth', ABSOLUTE: 'absolute' });

/** Схема документа baseline. */
export const BASELINE_SCHEMA = 'orphan-baseline/1';

/** Путь baseline от корня репозитория — единственный носитель. */
export const BASELINE_REL = 'docs/namespaces/ORPHAN_BASELINE.json';

/**
 * Состояния baseline. `ABSENT` отделён от пустого намеренно: отсутствие заморозки значит
 * «зуб не включён», а пустая заморозка — «включён в момент, когда сирот не было». Схлопни
 * их — и невключённый зуб на первом же прогоне объявит ВСЁ наследство приростом.
 */
export const BASELINE_STATES = Object.freeze({ OK: 'ok', ABSENT: 'absent', INVALID: 'invalid' });

/** Путь к сравнимому виду. */
function normalizePath(p) {
  return String(p ?? '').replaceAll('\\', '/').replace(/^\.\//u, '').replace(/\/+$/u, '');
}

/**
 * Прочитать документ baseline из уже загруженного JSON.
 *
 * Чтение файла оставлено зовущему: ядро инварианта в ФС не ходит по той же причине, что и
 * `belongs` — вердикт обязан воспроизводиться на замороженных входах.
 *
 * @returns {{state: string, paths: Set<string>, frozenAt: string|null, problems: string[]}}
 */
export function readBaseline(doc) {
  if (doc === null || doc === undefined) {
    return { state: BASELINE_STATES.ABSENT, paths: new Set(), frozenAt: null, problems: ['baseline не заморожен — зуб не включён'] };
  }
  const problems = [];
  if (doc?.schema !== BASELINE_SCHEMA) {
    problems.push(`schema=${doc?.schema === undefined ? '(нет)' : String(doc.schema)} — ожидается «${BASELINE_SCHEMA}»`);
  }
  if (!Array.isArray(doc?.paths)) problems.push('paths не массив');
  if (typeof doc?.frozenAt !== 'string' || Number.isNaN(Date.parse(doc?.frozenAt ?? ''))) {
    problems.push('frozenAt не ISO-8601 — момент заморозки обязан быть назван');
  }
  if (problems.length > 0) return { state: BASELINE_STATES.INVALID, paths: new Set(), frozenAt: null, problems };
  return {
    state: BASELINE_STATES.OK,
    paths: new Set(doc.paths.map(normalizePath)),
    frozenAt: doc.frozenAt,
    problems: [],
  };
}

/**
 * Заморозить baseline из текущего множества сирот.
 *
 * Отдельная функция, а не побочный эффект прогона: §5 требует, чтобы перезаморозка была
 * **явным актом со следом**. Побочная перезаморозка обнулила бы весь смысл фазы 1 — любой
 * новый сирота становился бы наследством в тот же миг, как его увидели.
 *
 * `frozenAt` приходит параметром: см. запрет на часы внутри зуба.
 */
export function freezeBaseline(orphanPaths, frozenAtIso, reason) {
  return {
    schema: BASELINE_SCHEMA,
    frozenAt: frozenAtIso,
    reason: typeof reason === 'string' && reason.trim() !== '' ? reason : 'не названа',
    paths: [...new Set((orphanPaths ?? []).map(normalizePath))].sort(),
  };
}

/**
 * Вычислить инвариант.
 *
 * @param {{
 *   orphans: readonly string[],
 *   baseline: {state:string, paths:Set<string>},
 *   waivers?: readonly object[],
 *   now?: string,
 *   phase?: string,
 *   scope?: readonly string[]|null,
 * }} input `scope` — область проверки: pre-push сужает её до затронутого пушем, полный отчёт
 *   не сужает вовсе (`null`).
 * @returns {{ok: boolean, phase: string, growth: string[], inherited: string[], waived: string[], denominator: number, scoped: boolean, problems: string[]}}
 */
export function checkInvariant(input) {
  const {
    orphans = [],
    // Умолчание — тот же разбор, что и у явного «документа нет»: иначе зовущий без baseline
    // получал бы другую формулировку отказа, чем зовущий с отсутствующим файлом, хотя случай
    // один и тот же — зуб не включён.
    baseline = readBaseline(null),
    waivers = [],
    now = null,
    phase = INVARIANT_PHASES.GROWTH,
    scope = null,
  } = input ?? {};

  const problems = [];
  if (phase !== INVARIANT_PHASES.GROWTH && phase !== INVARIANT_PHASES.ABSOLUTE) {
    problems.push(`фаза «${String(phase)}» вне двух — третьей у инварианта нет`);
  }
  // Невключённый зуб НЕ судит. Иначе первый же прогон объявил бы приростом всё наследство и
  // заблокировал пуш за то, что накоплено до него, — ровно та несправедливость, ради которой
  // фаза 1 и введена.
  if (baseline.state !== BASELINE_STATES.OK) {
    problems.push(...(baseline.problems ?? ['baseline недоступен']));
  }
  const all = [...new Set((orphans ?? []).map(normalizePath))].sort();

  if (problems.length > 0) {
    // Знаменатель отдаётся ДАЖЕ при отказе: он измерен и правдив, а `denominator: 0` был бы
    // числом, которого никто не считал. Отчёт печатает его рядом со словами «проверка не
    // состоялась» — «сирот 42, но вердикта нет» честно, «сирот 0» ложно.
    return { ok: false, phase, growth: [], inherited: [], waived: [], denominator: all.length, scoped: scope !== null, problems };
  }

  const waived = activeWaiverPaths(waivers, now);
  const scopeSet = scope === null ? null : new Set(scope.map(normalizePath));
  const inScope = scopeSet === null ? all : all.filter((p) => scopeSet.has(p));

  const waivedHere = inScope.filter((p) => waived.has(p));
  const rest = inScope.filter((p) => !waived.has(p));
  const inherited = rest.filter((p) => baseline.paths.has(p));
  const growth = rest.filter((p) => !baseline.paths.has(p));

  // Фаза 1 судит только прирост; фаза 2 — всё, что не освобождено. Наследство в фазе 1 не
  // просто «прощается»: оно остаётся видимым счётчиком, иначе исчезнет из поля зрения совсем.
  const failing = phase === INVARIANT_PHASES.GROWTH ? growth : [...growth, ...inherited];
  return {
    ok: failing.length === 0,
    phase,
    growth,
    inherited,
    waived: waivedHere,
    denominator: all.length,
    scoped: scopeSet !== null,
    problems: [],
  };
}
