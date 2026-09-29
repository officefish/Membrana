/**
 * Порт книги сделанного: git (oversized-мерджи ствола за окно) + gh (билеты за окно) →
 * блок для промпта вечера (блок b3 спринта `ritual-reads-done-work`, И8).
 *
 * Здесь ФС-независимые вызовы процессов и разбор их вывода; все суждения — в чистом ядре
 * `review-done-ledger.mjs`. Шов `run` инжектируется зубами: детерминизм без git и сети.
 *
 * ОТКАЗ ПЕЧАТАЕТСЯ СЛОВАМИ. Недоступный gh или git не даёт пустого блока и не даёт «разбор не
 * заведён»: без опроса билетов такое утверждение было бы ложью того же класса, что чинится.
 * Блок тогда несёт причину и список PR с пометкой «билеты не опрошены».
 */
import { execFileSync } from 'node:child_process';

// Природа коммита (code/docs/mixed) и порог — из ядра очереди oversized: книга аннотирует ту же
// очередь, и «что считается кодом» обязано быть одним носителем, а не второй копией списка.
import { describeCommit, NATURES } from './review-oversized-queue.mjs';
import { buildDoneLedger, dayOf, formatDoneLedger } from './review-done-ledger.mjs';

/** Окно книги по умолчанию: неделя. Слот 27.09 обязан быть виден вечером 29.09. */
export const DONE_LEDGER_DAYS = 7;

/** Номер PR — ПОСЛЕДНЯЯ скобка `(#N)` заголовка: так ставит squash-мердж GitHub. */
export function prOfSubject(subject) {
  const all = [...String(subject ?? '').matchAll(/\(#(\d+)\)/gu)];
  return all.length === 0 ? null : Number(all[all.length - 1][1]);
}

/** День начала окна: `today - days` календарных суток, строкой YYYY-MM-DD. */
export function sinceDayOf(today, days = DONE_LEDGER_DAYS) {
  const d = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`sinceDayOf: день «${today}» не в виде YYYY-MM-DD`);
  d.setUTCDate(d.getUTCDate() - Math.max(0, Number(days) || 0));
  return d.toISOString().slice(0, 10);
}

/**
 * Разбор `git log --no-merges --format=%H%x09%ad%x09%s --date=short --numstat`:
 * строка заголовка, пустая строка, строки `ins\tdel\tpath`. Природа и oversized — словами ядра
 * очереди (`describeCommit`): docs-only PR (ритуальные снимки) в книгу не входят, как и в очередь
 * по умолчанию — иначе книга тонет в артефактах вечера.
 *
 * @param {string} text
 * @returns {Array<{sha:string, mergedDay:string|null, subject:string, pr:number|null, changedLines:number, nature:string, oversized:boolean}>}
 */
export function parseGitLogNumstat(text) {
  const out = [];
  let current = null;
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trimEnd();
    if (/^[0-9a-f]{40}\t/u.test(line)) {
      const [sha, day, ...rest] = line.split('\t');
      const subject = rest.join('\t');
      current = { sha, mergedDay: dayOf(day), subject, pr: prOfSubject(subject), files: [] };
      out.push(current);
      continue;
    }
    const m = current ? /^(\d+|-)\t(\d+|-)\t(.+)$/u.exec(line) : null;
    if (m) current.files.push({ path: m[3], changedLines: (Number(m[1]) || 0) + (Number(m[2]) || 0) });
  }
  return out.map((c) => {
    const d = describeCommit(c);
    return { sha: c.sha, mergedDay: c.mergedDay, subject: c.subject, pr: c.pr, changedLines: d.total, nature: d.nature, oversized: d.oversized };
  });
}

/**
 * Разбор вывода `gh issue list --json number,title,createdAt,body,state`.
 * @param {string} text
 */
export function parseIssuesJson(text) {
  const parsed = JSON.parse(String(text ?? ''));
  if (!Array.isArray(parsed)) throw new Error('gh вернул не список');
  return parsed;
}

const DEFAULT_RUN = (cmd, args, cwd) => {
  try {
    return { ok: true, stdout: execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }) };
  } catch (error) {
    return { ok: false, stdout: '', error };
  }
};

const reasonOf = (r, what) => `${what}: ${r?.error?.message?.split('\n')[0] ?? 'команда не отработала'}`;

/**
 * Блок «Сделанное, заведённое билетами» для промпта вечера.
 *
 * @param {{cwd?: string, today?: string, days?: number, run?: typeof DEFAULT_RUN}} [opts]
 * @returns {{ok: boolean, block: string, reason: string|null, oversized: number, ticketed: number}}
 */
export function collectDoneLedgerBlock(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const days = opts.days ?? DONE_LEDGER_DAYS;
  const run = opts.run ?? DEFAULT_RUN;
  const sinceDay = sinceDayOf(today, days);
  const title = '## Сделанное, заведённое билетами (oversized-PR ствола ↔ билеты-результаты)';

  // Ствол — origin/main, если он есть в клоне: вечер может идти с ветки, а мерджи живут в стволе.
  const ref = run('git', ['rev-parse', '--verify', '--quiet', 'origin/main'], cwd).ok ? 'origin/main' : 'HEAD';
  const log = run('git', ['log', '--no-merges', `--since=${sinceDay}`, '--format=%H%x09%ad%x09%s', '--date=short', '--numstat', ref], cwd);
  if (!log.ok) {
    const reason = reasonOf(log, 'git log');
    return { ok: false, reason, oversized: 0, ticketed: 0, block: `${title}\n\n(книга сделанного недоступна: ${reason}; судить «разбор не сделан» по этому блоку нельзя)` };
  }
  const parsed = parseGitLogNumstat(log.stdout);
  const docsOnly = parsed.filter((c) => c.pr !== null && c.oversized && c.nature === NATURES.DOCS).length;
  const prs = parsed
    .filter((c) => c.pr !== null && c.mergedDay !== null && c.oversized && c.nature !== NATURES.DOCS)
    .map((c) => ({ pr: c.pr, mergedDay: c.mergedDay, subject: c.subject, changedLines: c.changedLines }));

  const gh = run('gh', ['issue', 'list', '--state', 'all', '--search', `created:>=${sinceDay}`, '--limit', '200', '--json', 'number,title,createdAt,body,state'], cwd);
  let issues;
  if (gh.ok) {
    try {
      issues = parseIssuesJson(gh.stdout);
    } catch (e) {
      gh.ok = false;
      gh.error = e;
    }
  }
  if (!gh.ok) {
    const reason = reasonOf(gh, 'gh issue list');
    const lines = [title, '', `(книга сделанного недоступна: ${reason} — билеты не опрошены; судить «разбор не сделан» по этому блоку нельзя)`, ''];
    for (const p of prs.slice(0, 12)) lines.push(`- **#${p.pr}** (${p.mergedDay} · ${p.changedLines} строк) ${p.subject} → билеты не опрошены`);
    return { ok: false, reason, oversized: prs.length, ticketed: 0, block: lines.join('\n') };
  }

  const ledger = buildDoneLedger({ prs, issues });
  const ticketed = ledger.entries.filter((e) => e.status === 'ticketed').length;
  const sources =
    `Источники: git log ${ref} с ${sinceDay} (порог oversized и природа коммита — как у review:oversized; ` +
    `docs-only oversized не показаны: ${docsOnly}), gh issue list created:>=${sinceDay} (${issues.length} билетов).`;
  return { ok: true, reason: null, oversized: ledger.entries.length, ticketed, block: `${formatDoneLedger(ledger, { sinceDay })}\n\n${sources}` };
}
