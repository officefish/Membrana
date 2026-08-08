/**
 * Вердикт по атому утверждения — чистое тотальное ядро.
 *
 * Блок b1 плана `docs/sprint/cut/feedback-claims-code-probe.json` (карточка
 * `feedback-claims-code-probe`, #1795). Пара к `atoms.mjs`: там форма, здесь факт.
 *
 * СЕМАНТИКА ЗЕРКАЛЬНА УТРЕННЕЙ. `main-day-probe` проверяет посылку «работы ещё нет», и
 * найденный маркер её ОПРОВЕРГАЕТ. Здесь утверждение ССЫЛАЕТСЯ на сущность, и нарушение —
 * когда сущности по адресу её класса НЕТ. Поэтому это не второй экземпляр того же ядра, и
 * реэкспорта оттуда быть не может: совпадает раскрой, не предикат.
 *
 * ЧЕТЫРЕ ИСХОДА, а не два. Гейт правдивости, который красит жёлтое в красное, стоит дороже
 * пропуска: команда перестаёт верить гейтам, и следующая находка утонет вместе с шумом.
 * Поэтому `unknown` не красный (эталон `drift-anchor-divergence` #413), а расхождение при
 * существующей сущности — `soft`, и ласточку он не держит.
 *
 * ФАКТЫ ПРИХОДЯТ ГОТОВЫМИ. Ядро не зовёт ни git, ни fs — оно принимает `ClaimEvidence`, как
 * `probeAssertion` принимает `ProbeEvidence`. Конспект исполнителя предлагал передавать
 * функции-пробники; так I/O протёк бы в чистый слой, и тотальность держалась бы на обещании
 * обвязки не бросать исключение. Здесь она держится на форме данных.
 */
import { ATOM_CLASSES, CLIENT_PATH_PREFIXES } from './atoms.mjs';

/**
 * Исходы. Список закрыт: пятый исход означал бы правило, о котором не знает ни отчёт,
 * ни предикат ласточки.
 */
export const OUTCOMES = Object.freeze({
  /** Сущность есть по адресу своего класса — утверждение опирается на факт. */
  HOLDS: 'holds',
  /** Класс опознан, сущности по его адресу нет. Красное: ласточка стоит. */
  HARD: 'violates.hard',
  /** Сущность есть, но состояние расходится с утверждением. Жёлтое: ласточку не держит. */
  SOFT: 'violates.soft',
  /** Класс не опознан либо факт не добыт. Не алерт. */
  UNKNOWN: 'unknown',
});

/**
 * Факты по одному атому. Каждое поле трёхзначно: `true`/`false` — факт, `null` —
 * «узнать не удалось». Отсутствие ключа читается как `null`.
 *
 * @typedef {{
 *   symbolDecls?: number | null,
 *   pathExists?: boolean | null,
 *   docExists?: boolean | null,
 *   cardFound?: boolean | null,
 *   cardStatus?: 'active' | 'archived' | null,
 *   cardDeliveredPr?: number | null,
 *   verbExists?: boolean | null,
 *   prMerged?: boolean | null,
 *   prFiles?: readonly string[] | null,
 *   sha?: string,
 * }} ClaimEvidence
 */

/**
 * @typedef {{
 *   outcome: string,
 *   addr: string,
 *   reason: string,
 *   klass: string | null,
 * }} ClaimVerdict
 */

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const bool = (v) => (typeof v === 'boolean' ? v : null);
const list = (v) => (Array.isArray(v) ? v : null);

/** Адрес класса — куда смотрели. Печатается в отчёте, чтобы строку можно было перепроверить руками. */
export function addressOf(klass, token) {
  const t = typeof token === 'string' ? token : '—';
  switch (klass) {
    case ATOM_CLASSES.SYMBOL:
      return `git grep «${t}» в packages/**/src/**, apps/**/src/**`;
    case ATOM_CLASSES.PATH:
      return `файл ${t}`;
    case ATOM_CLASSES.DOC:
      return `документ ${t} в docs/**`;
    case ATOM_CLASSES.CARD:
      return `карточка ${t} в docs/tasks/registry.json`;
    case ATOM_CLASSES.VERB:
      return `глагол «${t}» в scripts package.json`;
    case ATOM_CLASSES.PR:
      return `сквош-коммит ствола с «(${t})»`;
    default:
      return `адреса нет: форма ${t} не опознана`;
  }
}

/**
 * Проверка одного класса: `true` — сущность на месте, `false` — её нет, `null` — не узнали.
 *
 * @param {string} klass
 * @param {{token: string, clientSide?: boolean}} atom
 * @param {ClaimEvidence} evidence
 * @returns {{fact: boolean | null, reason: string, soft?: boolean}}
 */
function probeClass(klass, atom, evidence) {
  const e = evidence ?? {};
  switch (klass) {
    case ATOM_CLASSES.SYMBOL: {
      const decls = num(e.symbolDecls);
      if (decls === null) return { fact: null, reason: 'исходники не опрошены' };
      return decls > 0
        ? { fact: true, reason: `вхождений в исходниках: ${decls}` }
        : { fact: false, reason: 'ноль вхождений в исходниках' };
    }
    case ATOM_CLASSES.PATH: {
      const exists = bool(e.pathExists);
      if (exists === null) return { fact: null, reason: 'дерево не опрошено' };
      return exists
        ? { fact: true, reason: 'файл на месте' }
        : { fact: false, reason: 'файла нет' };
    }
    case ATOM_CLASSES.DOC: {
      const exists = bool(e.docExists);
      if (exists === null) return { fact: null, reason: 'docs не опрошены' };
      return exists
        ? { fact: true, reason: 'документ на месте' }
        : { fact: false, reason: 'документа нет' };
    }
    case ATOM_CLASSES.CARD: {
      const found = bool(e.cardFound);
      if (found === null) return { fact: null, reason: 'реестр не опрошен' };
      if (!found) return { fact: false, reason: 'карточки в реестре нет' };
      // НАХОДКА «реестр протух» — прямой канон утреннего гейта (staleRegistry): работа
      // доставлена, а карточка всё ещё active. Вещдок 07.08: протокол просил «реализовать
      // ADR-0024 через morning-gates-two-moments» на следующий день после влитого PR #1766,
      // и карточка была active — то есть реестр подтверждал вчерашнее состояние.
      // Это НЕ hard: сущность существует, ложно состояние. Гейт не чинит и не закрывает.
      if (e.cardStatus === 'active' && num(e.cardDeliveredPr) !== null) {
        return {
          fact: false,
          soft: true,
          reason: `карточка active, но работа доставлена PR #${e.cardDeliveredPr} — РЕЕСТР ПРОТУХ`,
        };
      }
      return { fact: true, reason: `карточка в реестре (${e.cardStatus ?? 'статус неизвестен'})` };
    }
    case ATOM_CLASSES.VERB: {
      const exists = bool(e.verbExists);
      if (exists === null) return { fact: null, reason: 'package.json не опрошен' };
      return exists
        ? { fact: true, reason: 'глагол объявлен' }
        : { fact: false, reason: 'глагола нет в scripts' };
    }
    case ATOM_CLASSES.PR: {
      const merged = bool(e.prMerged);
      if (merged === null) return { fact: null, reason: 'ствол не опрошен' };
      if (!merged) return { fact: null, reason: 'PR не влит — содержимое из ствола не читается' };
      const files = list(e.prFiles);
      if (files === null) return { fact: null, reason: 'состав коммита не прочитан' };
      // Про слой PR гейт судит ТОЛЬКО когда утверждение сам слой и называет. Номер PR без
      // слова о клиенте ничего о клиентской части не утверждает, и домысливать нельзя.
      if (atom?.clientSide) {
        const client = files.filter((f) =>
          CLIENT_PATH_PREFIXES.some((p) => typeof f === 'string' && f.startsWith(p)),
        );
        if (client.length > 0) return { fact: true, reason: `клиентских файлов в PR: ${client.length}` };
        // Догадка красным не бывает: строка, сказанная модальностью («там могут быть
        // UI-фрагменты»), ничего о коде не утверждает — спорить с ней гейт не вправе.
        // `clientSideFirm` — есть ли хоть одна строка, где клиентский смысл сказан ТВЁРДО;
        // считается по строке в `dedupeAtoms`, иначе склейка эха выдаёт догадку за факт.
        const firm = atom?.clientSideFirm !== undefined ? atom.clientSideFirm : !atom?.hedged;
        return {
          fact: false,
          soft: !firm,
          reason: firm
            ? `утверждение о клиентской части, а среди ${files.length} файлов PR клиентских нет`
            : `предположение о клиентской части, а среди ${files.length} файлов PR клиентских нет`,
        };
      }
      return { fact: true, reason: `PR влит, файлов: ${files.length}` };
    }
    default:
      return { fact: null, reason: 'форма не опознана — проверять нечем' };
  }
}

/**
 * Вынести вердикт по атому.
 *
 * Правило разрешения множества классов: любой `holds` побеждает. Асимметрия намеренна и
 * ровно та же, что у утреннего гейта: формы пересекаются неустранимо (`MAIN_DAY_ISSUE` —
 * и документ, и константа), и «нашли по одному из законных адресов» доказывает, что
 * утверждение на факт опирается. Обратное — «не нашли ни по одному» — доказательство лишь
 * при ОДНОМ кандидате; при нескольких это `soft`, потому что могли смотреть не туда. Это
 * прямая профилактика 03.08.
 *
 * @param {{token: string, classes?: readonly string[], clientSide?: boolean}} atom
 * @param {ClaimEvidence} evidence
 * @returns {ClaimVerdict}
 */
export function verdictFor(atom, evidence) {
  const token = typeof atom?.token === 'string' ? atom.token : '—';
  const classes = Array.isArray(atom?.classes) && atom.classes.length > 0
    ? atom.classes
    : [ATOM_CLASSES.OPAQUE];
  const at = evidence?.sha ? ` @${String(evidence.sha).slice(0, 12)}` : '';

  const probes = classes.map((klass) => ({ klass, ...probeClass(klass, atom, evidence) }));

  const held = probes.find((p) => p.fact === true);
  if (held) {
    return {
      outcome: OUTCOMES.HOLDS,
      klass: held.klass,
      addr: addressOf(held.klass, token),
      reason: `${held.reason}${at}`,
    };
  }

  const denied = probes.filter((p) => p.fact === false);
  if (denied.length === 0) {
    const why = probes.map((p) => p.reason).join('; ');
    return {
      outcome: OUTCOMES.UNKNOWN,
      klass: probes.length === 1 ? probes[0].klass : null,
      addr: addressOf(probes[0]?.klass, token),
      reason: `${why}${at}`,
    };
  }

  const first = denied[0];
  // Мягкое опровержение объявляет себя само (реестр протух) либо возникает из
  // неоднозначности класса: несколько адресов, ни один не подтвердил.
  const soft = denied.some((p) => p.soft === true) || probes.length > 1;
  return {
    outcome: soft ? OUTCOMES.SOFT : OUTCOMES.HARD,
    klass: first.klass,
    addr: addressOf(first.klass, token),
    reason: `${denied.map((p) => p.reason).join('; ')}${at}`,
  };
}

/**
 * Прогнать набор атомов.
 *
 * @param {readonly {atom: object, evidence: ClaimEvidence}[]} items
 */
export function verdictsFor(items) {
  return (items ?? []).map((item) => ({
    token: item?.atom?.token ?? '—',
    line: item?.atom?.line ?? null,
    classes: item?.atom?.classes ?? [ATOM_CLASSES.OPAQUE],
    context: item?.atom?.context ?? '',
    ...verdictFor(item?.atom, item?.evidence),
  }));
}

/** Есть ли hard-нарушение — единственное основание задержать ласточку партнёрам. */
export function hasHardViolation(verdicts) {
  return (verdicts ?? []).some((v) => v?.outcome === OUTCOMES.HARD);
}

const OUTCOME_ORDER = Object.freeze({
  [OUTCOMES.HARD]: 0,
  [OUTCOMES.SOFT]: 1,
  [OUTCOMES.UNKNOWN]: 2,
  [OUTCOMES.HOLDS]: 3,
});

/** Человекочитаемая метка. ТЕКСТОМ, а не цветом: требование Rodchenko — цвет не переживает пайп в файл. */
export function outcomeLabel(outcome) {
  switch (outcome) {
    case OUTCOMES.HARD:
      return 'НЕ ПОДТВЕРЖДЕНО';
    case OUTCOMES.SOFT:
      return 'сомнение';
    case OUTCOMES.UNKNOWN:
      return 'не проверено';
    case OUTCOMES.HOLDS:
      return 'подтверждено';
    default:
      return '—';
  }
}

/**
 * Отчёт «утверждение → адрес → вердикт». Нарушенные сверху.
 *
 * `holds` в таблицу НЕ печатаются по умолчанию: их десятки на протокол, и они утопили бы
 * находку — та же болезнь, от которой лечится отчёт утреннего гейта. Их счёт остаётся в
 * итоговой строке, чтобы «проверено ноль» нельзя было спутать с «всё подтвердилось».
 *
 * @param {readonly (ClaimVerdict & {token: string, line: number|null})[]} verdicts
 */
export function formatClaimsReport(verdicts, { includeHolds = false } = {}) {
  const all = [...(verdicts ?? [])];
  const shown = all
    .filter((v) => includeHolds || v?.outcome !== OUTCOMES.HOLDS)
    .sort((a, b) => (OUTCOME_ORDER[a?.outcome] ?? 4) - (OUTCOME_ORDER[b?.outcome] ?? 4));

  const counts = all.reduce((acc, v) => {
    const k = v?.outcome ?? 'unknown';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const tally =
    `Итог: ${counts[OUTCOMES.HARD] ?? 0} не подтверждено · ${counts[OUTCOMES.SOFT] ?? 0} сомнений · ` +
    `${counts[OUTCOMES.UNKNOWN] ?? 0} не проверено · ${counts[OUTCOMES.HOLDS] ?? 0} подтверждено`;

  if (shown.length === 0) {
    return [tally, '', 'Ни одного утверждения, требующего внимания.'].join('\n');
  }

  const lines = [
    '| Вердикт | Утверждение | Строка | Адрес проверки | Доказательство |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const v of shown) {
    lines.push(
      `| ${outcomeLabel(v.outcome)} | \`${v.token}\` | ${v.line ?? '—'} | ${v.addr} | ${v.reason} |`,
    );
  }
  return [tally, '', ...lines].join('\n');
}
