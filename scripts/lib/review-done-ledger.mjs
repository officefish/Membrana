/**
 * Книга сделанного (`review-done-ledger`) — чистое ядро, без ФС, сети и часов
 * (блок b2 спринта `ritual-reads-done-work`, И8 недельного плана 28.09).
 *
 * ЗАЧЕМ. Архитектурные слоты 27.09 по PR #2488 и #2489 нашли настоящее и легли в билеты
 * #2492–#2498. Вечерний фидбек читает документы дня, git за день и гейт — билетов ни в одном
 * входе, и команда четыре вечера подряд требовала слот, который сделан. Результат разбора
 * жил там, куда читатель не смотрел. Ядро сводит два списка — oversized-PR ствола и билеты — в
 * одну книгу: у какого PR разбор ЗАВЕДЁН билетом, у какого — нет.
 *
 * ЧТО СЧИТАЕТСЯ РЕЗУЛЬТАТОМ РАЗБОРА (умолчание нарезки, принято владельцем 29.09):
 * билет, в заголовке или теле которого стоит ссылка `#<PR>` целым номером, созданный НЕ РАНЬШЕ
 * дня мерджа PR. Билет до мерджа — сопровождение PR, а не результат его разбора; билет,
 * упоминающий `#24880`, к #2488 не относится. Автор и лейбл не требуются.
 *
 * ПРИЗНАННЫЙ ПРЕДЕЛ (назван резчиком): билет без явного `#PR` в тексте — по имени ветки, по
 * файлу, по смыслу — книгой НЕ находится. Это выбор в пользу нуля ложных связок: книга
 * аннотирует очередь oversized, и «разобран» без вещдока был бы хуже, чем «не заведён».
 *
 * КНИГА НЕ СНИМАЕТ С ОЧЕРЕДИ. Основание снятия у `review:oversized` прежнее (артефакт ревью
 * или commit-status) — слово владельца 29.09. Здесь только «разбор заведён билетами #…».
 */
import { formatResultFacts, isSegmentOversized, resultFactsFromPaths } from './day-work-diff.mjs';

/** Исходы записи книги. Список закрыт: третьего состояния у PR относительно билетов нет. */
export const LEDGER_STATUS = Object.freeze({
  /** Есть хоть один билет-результат. */
  TICKETED: 'ticketed',
  /** Билетов-результатов нет — разбор не заведён (либо заведён без `#PR`, см. предел). */
  NOT_TICKETED: 'not-ticketed',
});

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/u;

/** День YYYY-MM-DD из ISO-момента или дня; иное — null (не догадка). */
export function dayOf(value) {
  if (typeof value !== 'string') return null;
  const head = value.slice(0, 10);
  return DAY_RE.test(head) ? head : null;
}

/**
 * Номера PR/issue, на которые ссылается текст: `#N` целым числом. `#24880` не даёт `2488`,
 * `x#12` не считается ссылкой (нет границы слева), URL-формы (`/pull/2488`) сознательно не
 * разбираются — ссылка в теле билета в этом репозитории пишется решёткой.
 *
 * @param {string|null|undefined} text
 * @returns {Set<number>}
 */
export function prRefsIn(text) {
  const out = new Set();
  const s = String(text ?? '');
  for (const m of s.matchAll(/(?<![\w#/])#(\d+)(?!\d)/gu)) out.add(Number(m[1]));
  return out;
}

/**
 * Свести PR и билеты в книгу.
 *
 * @param {{
 *   prs: ReadonlyArray<{pr: number|string, mergedDay: string, subject?: string, changedLines?: number, files?: readonly string[], paths?: readonly string[], resultFacts?: readonly unknown[]}>,
 *   issues: ReadonlyArray<{number: number|string, title?: string, body?: string, createdAt?: string, state?: string}>,
 *   onlyOversized?: boolean
 * }} p
 * @returns {{entries: Array<{pr:number, mergedDay:string, subject:string, changedLines:number|null,
 *   status:string, tickets: Array<{number:number, day:string, title:string, state:string|null}>, resultFacts: Array<{kind:string,label:string,path:string,sprintId:string|null}>}>,
 *   dropped: {noPr:number, badMergedDay:number, notOversized:number, issuesWithoutDay:number}}}
 */
export function buildDoneLedger(p) {
  const onlyOversized = p?.onlyOversized ?? true;
  const dropped = { noPr: 0, badMergedDay: 0, notOversized: 0, issuesWithoutDay: 0 };

  const issues = [];
  for (const raw of p?.issues ?? []) {
    const number = Number(raw?.number);
    const day = dayOf(raw?.createdAt);
    if (!Number.isInteger(number) || number <= 0) continue;
    if (day === null) {
      // Билет без даты создания в сравнение не входит: «не раньше мерджа» без даты не судится.
      dropped.issuesWithoutDay += 1;
      continue;
    }
    issues.push({
      number,
      day,
      title: String(raw?.title ?? ''),
      state: typeof raw?.state === 'string' ? raw.state : null,
      refs: new Set([...prRefsIn(raw?.title), ...prRefsIn(raw?.body)]),
    });
  }

  const entries = [];
  for (const raw of p?.prs ?? []) {
    const pr = Number(raw?.pr);
    if (!Number.isInteger(pr) || pr <= 0) {
      dropped.noPr += 1;
      continue;
    }
    const mergedDay = dayOf(raw?.mergedDay);
    if (mergedDay === null) {
      dropped.badMergedDay += 1;
      continue;
    }
    const changedLines = Number.isFinite(Number(raw?.changedLines)) ? Number(raw.changedLines) : null;
    if (onlyOversized && !isSegmentOversized(changedLines ?? 0)) {
      dropped.notOversized += 1;
      continue;
    }
    const files = Array.isArray(raw?.files) ? raw.files : Array.isArray(raw?.paths) ? raw.paths : [];
    const resultFacts = Array.isArray(raw?.resultFacts) ? raw.resultFacts : resultFactsFromPaths(files);
    const tickets = issues
      .filter((i) => i.number !== pr && i.refs.has(pr) && i.day >= mergedDay)
      .sort((a, b) => (a.day === b.day ? a.number - b.number : a.day < b.day ? -1 : 1))
      .map(({ number, day, title, state }) => ({ number, day, title, state }));
    entries.push({
      pr,
      mergedDay,
      subject: String(raw?.subject ?? ''),
      changedLines,
      status: tickets.length > 0 ? LEDGER_STATUS.TICKETED : LEDGER_STATUS.NOT_TICKETED,
      tickets,
      resultFacts,
    });
  }
  // Свежие мерджи выше: вечер судит день, а не историю.
  entries.sort((a, b) => (a.mergedDay === b.mergedDay ? b.pr - a.pr : a.mergedDay < b.mergedDay ? 1 : -1));
  return { entries, dropped };
}

/**
 * Книга → строки markdown для промпта вечера. Пустая книга говорит об этом словами.
 *
 * @param {ReturnType<typeof buildDoneLedger>} ledger
 * @param {{sinceDay?: string, limit?: number}} [opts]
 * @returns {string}
 */
export function formatDoneLedger(ledger, opts = {}) {
  const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : 12;
  const entries = ledger?.entries ?? [];
  const lines = [
    '## Сделанное, заведённое билетами (oversized-PR ствола ↔ билеты-результаты)',
    '',
    'Разбор PR считается ЗАВЕДЁННЫМ, если есть билет со ссылкой `#PR`, созданный не раньше дня мерджа.',
    'Судить «разбор не сделан» можно только по строке «разбор не заведён» ниже — не по памяти прежних',
    'протоколов. Книга не снимает PR с очереди ревью: она говорит, где лежит результат.',
    '',
  ];
  if (opts.sinceDay) lines.push(`Окно: мерджи с ${opts.sinceDay}.`, '');
  if (entries.length === 0) {
    lines.push('(oversized-PR в окне нет)');
    return lines.join('\n');
  }
  for (const e of entries.slice(0, limit)) {
    const size = e.changedLines === null ? '' : ` · ${e.changedLines} строк`;
    const head = `- **#${e.pr}** (${e.mergedDay}${size}) ${e.subject}`.trimEnd();
    const facts = formatResultFacts(e.resultFacts);
    if (e.status === LEDGER_STATUS.TICKETED) {
      lines.push(`${head}`, `  → разбор заведён билетами: ${e.tickets.map((t) => `#${t.number} (${t.day}${t.state ? `, ${t.state}` : ''})`).join(', ')}`);
    } else {
      lines.push(`${head}`, '  → разбор не заведён (билета со ссылкой на PR нет)');
    }
    if (facts) lines.push(`  → ${facts}`);
  }
  if (entries.length > limit) lines.push(`- … ещё ${entries.length - limit} PR за окном показа`);
  const ticketed = entries.filter((e) => e.status === LEDGER_STATUS.TICKETED).length;
  lines.push('', `Итого: ${entries.length} oversized-PR, разбор заведён у ${ticketed}, не заведён у ${entries.length - ticketed}.`);
  return lines.join('\n');
}
