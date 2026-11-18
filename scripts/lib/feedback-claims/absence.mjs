/**
 * Утверждения об ОТСУТСТВИИ в вечернем протоколе — распознавание и вердикт (#2615).
 *
 * ПОВОД. 05–07.10 протокол три вечера подряд утверждал «ADR-0031 файлом в ствол не положен»,
 * хотя `docs/adr/ADR-0031-downgrade-archive.md` был в стволе с #2593 (05.10, 66153f58).
 * `feedback:claims` 06.10 дал «10 подтверждено, 0 расхождений»: атомы (`atoms.mjs`) судят
 * утверждения-ССЫЛКИ («X есть — найди X»), а «X нет» для них — та же ссылка на X, и найденный
 * X её «подтверждает». Ложный долг ушёл в план утра.
 *
 * СЕМАНТИКА — как у утреннего гейта (`main-day-probe`): посылка утверждает отсутствие, и
 * найденная по адресу сущность её ОПРОВЕРГАЕТ. Поэтому это отдельный модуль, а не класс атома.
 *
 * ЧТО РАСПОЗНАЁТСЯ (формы сняты с протоколов `docs/seanses/team-evening-feedback-2026-10-0{5,6}.md`):
 *   - явное отрицание при сущности в одном предложении:
 *       «архитектурный документ (ADR-0031) … не положен»,
 *       «ADR-0031 файлом в стволе — нет», «нет ADR-0031, манифеста»,
 *       «X не в стволе / нет в стволе / не в main», «#N не влит / не смёржен»,
 *       «X в ствол не попал / не доехал», «отсутствует в стволе», «файлом нет»;
 *   - долг: «ADR-0031 файлом в ствол — долг третьего дня, не закрыт» — тоже утверждение
 *     отсутствия (долг «положить» = файла нет);
 *   - ПЛАН-предпосылка: «положить docs/adr/ADR-0031-….md файлом», «ADR-0031 в ствол либо
 *     явный долг» — план не утверждает факт, но предполагает отсутствие. Опровергнутая
 *     предпосылка — «сомнение» (жёлтое), а не красное: план сделать сделанное — ложный долг,
 *     но не ложь о стволе.
 *
 * Сущности — только с точным адресом в стволе: номер ADR (`ADR-0031` → `docs/adr/ADR-0031*.md`),
 * путь с каталогом и расширением, номер PR/Issue (`#2593` → сквош ствола «(#2593)»).
 *
 * ГРАНИЦА (что НЕ судится — сказано, не спрятано):
 *   - состояние РАБОТЫ, а не ствола: «не сделано сегодня», «не начато», «не успели», «ветка
 *     не в main», «MFCC не в main» — нет сущности с адресом, нечего сверять;
 *   - утверждение о ДНЕ: «за день», «сегодня», «в затронутых путях», «в git log за день»,
 *     «в диффе» — «файла ADR в затронутых путях нет» правда про дифф дня, а не ложь о стволе;
 *   - модальность (`isHedged`): «возможно, не влит» — догадка, не факт;
 *   - совет и решение: «Держать #2204 в санитарии, не в стволе» — что делать, а не что есть;
 *   - таблицы, цитаты, код, комментарии — их отбрасывает `claimLines`, как и для атомов.
 * Пропуск дешевле ложного красного: гейт, который спорит с планом, учит не верить гейтам.
 *
 * Чистые функции: факты (`AbsenceEvidence`) приходят готовыми от обвязки
 * `scripts/feedback-claims-probe.mjs`.
 */
import { claimLines, isHedged } from './atoms.mjs';
import { OUTCOMES } from './verdict.mjs';

export const ABSENCE_KIND = Object.freeze({
  /** «X нет / не положен / не влит» — утверждение о стволе. */
  CLAIM: 'claim',
  /** «положить X», «X в ствол» — план, предполагающий отсутствие. */
  PLAN: 'plan',
});

/** Кириллица в JS-регэкспах не даёт `\b` — граница слова задаётся явно. */
const W = 'A-Za-zА-Яа-яЁё0-9_';
const END = `(?![${W}])`;

const ADR = new RegExp(`(?<![${W}])ADR-(\\d{4})${END}`, 'gu');
const PR = /(?<![\w#])#(\d{3,})(?!\d)/gu;
const PATH = /(?:^|[\s(`«"])((?:[\w.-]+\/)+[\w.-]+\.(?:md|mdx|mjs|js|ts|tsx|json|jsonl|yml|yaml|prisma))(?=$|[\s)`»",;:])/gu;

/** Явные отрицания факта ствола. Ищутся ПОСЛЕ сущности в том же предложении. */
const FILE_NEGATIONS = [
  `не\\s+положен[аоы]?${END}`,
  `(?:не|нет)\\s+в\\s+(?:стволе|main)${END}`,
  `в\\s+ствол[еу]?\\s+не\\s+(?:положен|попал|доехал|влит)[${W}]*`,
  `не\\s+(?:попал|доехал)[${W}]*\\s+(?:в\\s+ствол|до\\s+ствола|в\\s+main)`,
  `отсутству[${W}]*\\s+в\\s+(?:стволе|main)`,
  `в\\s+стволе\\s*[—–-]\\s*нет${END}`,
  `файлом\\s+нет${END}`,
  `нет\\s+файлом${END}`,
  `не\\s+существует${END}`,
];
const PR_NEGATIONS = [
  `не\\s+(?:влит|влита|влиты|влито)${END}`,
  `не\\s+(?:смёржен|смержен|замёржен|замержен)[аоы]?${END}`,
  `(?:не|нет)\\s+в\\s+(?:стволе|main)${END}`,
  `в\\s+ствол[еу]?\\s+не\\s+(?:попал|доехал|влит)[${W}]*`,
];
/** «нет ADR-0031» — отрицание ПЕРЕД сущностью; только для ADR и путей. */
const PREFIX_NEGATION = /(?:^|[\s(,;:])нет\s+$/u;

/** План: «положить X», «X (файлом) в ствол» (винительный — направление, а не место). */
const PLAN_AFTER = new RegExp(`^[^.;]{0,40}?(?:файлом\\s+)?в\\s+ствол${END}`, 'u');
const PLAN_BEFORE = /(?:положить|положи|кладём|класть|занести|внести)\s+(?:[\wА-Яа-яЁё-]+\s+){0,2}$/u;
/**
 * Долг ДНЯ при плановой форме — уже утверждение отсутствия: «— долг третьего дня, не закрыт».
 * Голое слово «долг» — нет: «в ствол либо явный долг с датой», «закрытие канонического долга:
 * ADR-0031 в ствол» — это план, долг там назван, а не констатирован.
 */
const DEBT = new RegExp(`(?:долг\\s+(?:[${W}-]+\\s+)?дня|не\\s+закрыт${END})`, 'u');
/** Совет/решение, а не факт: «Держать #2204 в санитарии, не в стволе». */
const ADVICE = /(?:^|[\s(:])(?:держать|оставить|оставлять|не\s+вливать|отложить|пусть)\s/iu;
/** Закрытие в предложении — сущность уже на месте, отсутствие не утверждается. */
const CLOSED = new RegExp(`(?<!не\\s)(?:закрыт|снят|положен|влит)${END}`, 'u');

/** Утверждение о ДНЕ/диффе, а не о стволе. */
const DAY_SCOPE = /(?:за\s+день|сегодня|в\s+затронутых\s+путях|в\s+диффе|дифф[еа]?\s+дня|в\s+git\s+log\s+за|в\s+этом\s+PR)/iu;

const fileNeg = new RegExp(FILE_NEGATIONS.join('|'), 'u');
const prNeg = new RegExp(PR_NEGATIONS.join('|'), 'u');

/** Предложения строки: по `;`, `!`, `?` и точке перед пробелом и прописной/концом. */
export function clauses(text) {
  return String(text)
    .split(/[;!?]\s+|\.\s+(?=[А-ЯЁA-Z*(«"0-9])|\.\s*$/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Сущности предложения с позициями. Путь к ADR — это путь, номер внутри него не дублируется. */
export function entitiesOf(clause) {
  const out = [];
  const taken = [];
  PATH.lastIndex = 0;
  let m;
  while ((m = PATH.exec(clause)) !== null) {
    const start = m.index + m[0].indexOf(m[1]);
    out.push({ type: 'path', token: m[1], start, end: start + m[1].length });
    taken.push([start, start + m[1].length]);
  }
  const inside = (i) => taken.some(([a, b]) => i >= a && i < b);
  ADR.lastIndex = 0;
  while ((m = ADR.exec(clause)) !== null) {
    if (inside(m.index)) continue;
    out.push({ type: 'adr', token: `ADR-${m[1]}`, number: m[1], start: m.index, end: m.index + m[0].length });
  }
  PR.lastIndex = 0;
  while ((m = PR.exec(clause)) !== null) {
    out.push({ type: 'pr', token: `#${m[1]}`, number: Number(m[1]), start: m.index, end: m.index + m[0].length });
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Утверждения об отсутствии в протоколе.
 *
 * @param {string} markdown тело протокола (секции самого probe снимать до вызова)
 * @returns {{token: string, type: string, number?: string|number, kind: string, line: number, context: string}[]}
 */
export function extractAbsenceClaims(markdown) {
  const out = [];
  const seen = new Set();
  for (const { line, text } of claimLines(markdown)) {
    for (const clause of clauses(text)) {
      if (DAY_SCOPE.test(clause) || isHedged(clause) || ADVICE.test(clause)) continue;
      const ents = entitiesOf(clause);
      for (let i = 0; i < ents.length; i += 1) {
        const e = ents[i];
        const next = ents.slice(i + 1).find((x) => x.type === e.type || (e.type !== 'pr') === (x.type !== 'pr'));
        const after = clause.slice(e.end, next ? next.start : clause.length);
        const before = clause.slice(0, e.start);
        let kind = null;
        if (e.type === 'pr') {
          if (prNeg.test(after)) kind = ABSENCE_KIND.CLAIM;
        } else if (fileNeg.test(after) || PREFIX_NEGATION.test(before)) {
          kind = ABSENCE_KIND.CLAIM;
        } else if (!CLOSED.test(clause) && (PLAN_AFTER.test(after) || PLAN_BEFORE.test(before))) {
          kind = DEBT.test(clause) ? ABSENCE_KIND.CLAIM : ABSENCE_KIND.PLAN;
        }
        if (!kind) continue;
        const key = `${line}::${e.token}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          token: e.token,
          type: e.type,
          ...(e.number !== undefined ? { number: e.number } : {}),
          kind,
          line,
          context: clause,
        });
      }
    }
  }
  return out;
}

/**
 * Факты по утверждению: `present` — `true`/`false`/`null` (не узнали); где нашли и с какого
 * коммита. `addedOn` — день появления в стволе (ГГГГ-ММ-ДД): утверждение старого протокола
 * судится по стволу НА ЕГО ДЕНЬ, иначе правда 01.10 стала бы ложью задним числом.
 *
 * @typedef {{present: boolean|null, where?: string, sha?: string, addedOn?: string, ref?: string}} AbsenceEvidence
 */

/**
 * Вердикт по утверждению об отсутствии.
 *
 * @param {{token: string, type: string, kind: string}} claim
 * @param {AbsenceEvidence} evidence
 * @param {{protocolDay?: string|null}} [opts] день протокола ГГГГ-ММ-ДД
 */
export function absenceVerdict(claim, evidence, { protocolDay = null } = {}) {
  const ref = evidence?.ref ?? 'ствол';
  const addr =
    claim.type === 'adr'
      ? `docs/adr/${claim.token}*.md в ${ref}`
      : claim.type === 'pr'
        ? `сквош «(${claim.token})» в ${ref}`
        : `файл ${claim.token} в ${ref}`;
  const said = claim.kind === ABSENCE_KIND.PLAN ? 'план предполагает отсутствие' : 'утверждается отсутствие';
  const present = evidence?.present;
  if (present === null || present === undefined) {
    return { outcome: OUTCOMES.UNKNOWN, addr, reason: `${said}; ствол не опрошен` };
  }
  if (present === false) {
    return { outcome: OUTCOMES.HOLDS, addr, reason: `${said}; в стволе нет — подтверждено` };
  }
  const since = [evidence.sha ? String(evidence.sha).slice(0, 8) : null, evidence.addedOn].filter(Boolean).join(', ');
  if (protocolDay && evidence.addedOn && evidence.addedOn > protocolDay) {
    return {
      outcome: OUTCOMES.HOLDS,
      addr,
      reason: `${said}; на день протокола (${protocolDay}) было правдой — появилось позже (${since})`,
    };
  }
  const where = evidence.where ?? claim.token;
  return {
    outcome: claim.kind === ABSENCE_KIND.PLAN ? OUTCOMES.SOFT : OUTCOMES.HARD,
    addr,
    reason:
      claim.kind === ABSENCE_KIND.PLAN
        ? `ОПРОВЕРГНУТО: план требует уже сделанного — ${where} есть в стволе${since ? ` с ${since}` : ''}`
        : `ОПРОВЕРГНУТО: ${where} есть в стволе${since ? ` с ${since}` : ''}`,
  };
}
