/**
 * DAY_MEMO · слой Фактов (фаза 1, блок 1 магистрали 28.07; вердикт консилиума
 * day-memo-evening-2026-07-27 Q1/Q2: факты пишет детерминированный генератор,
 * без LLM и сети, каждый факт — с меткой времени и указателем).
 *
 * Контракт стыка фазы 1 (сигнатура неизменна):
 *   buildFactsLayer(repoRoot, date) → {markdown, stats, problems[]}
 *
 * Модуль ЧИТАЕТ локальные артефакты и git-лог; файлов не пишет (сборка — фаза 2).
 * Пустой источник — честная строка «за день пусто»; нечитаемый — problems поимённо.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Номер PR из squash-заголовка: «… (#1373)» → 1373. Чистая. */
export function parseSquashPr(subject) {
  const m = String(subject ?? '').match(/\(#(\d+)\)\s*$/u);
  return m ? Number(m[1]) : null;
}

/** Разбор git-лога формата %H|%cI|%s → факты с метками времени. Чистая. */
export function factsFromGitLog(logText) {
  const facts = [];
  for (const line of String(logText ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [sha, at, ...rest] = line.split('|');
    if (!sha || !at || rest.length === 0) continue;
    const subject = rest.join('|');
    facts.push({ at, sha: sha.slice(0, 8), subject, pr: parseSquashPr(subject) });
  }
  return facts;
}

/** Строки jsonl за дату по полю-метке. Битые строки — в problems, не exception. Чистая. */
export function jsonlForDate(text, date, atField) {
  const rows = [];
  const problems = [];
  let lineNo = 0;
  for (const line of String(text ?? '').split(/\r?\n/)) {
    lineNo += 1;
    if (!line.trim()) continue;
    try {
      const j = JSON.parse(line);
      const at = String(j[atField] ?? '');
      if (at.startsWith(date)) rows.push(j);
    } catch {
      problems.push(`строка ${lineNo}: битый JSON`);
    }
  }
  return { rows, problems };
}

/** Итоговая строка отчёта памяти («**Итог:** записано N · вытеснено M»). Чистая. */
export function memoryReportSummary(text) {
  const m = String(text ?? '').match(/\*\*Итог:\*\*[^\n]*/u);
  return m ? m[0].replace(/\*\*/gu, '') : null;
}

function section(title, lines) {
  return [`### ${title}`, '', ...(lines.length ? lines : ['- за день пусто']), ''];
}

/**
 * Слой Фактов дня. Каждый факт — метка времени + указатель (SHA/id/файл).
 * @param {string} repoRoot
 * @param {string} date YYYY-MM-DD
 * @returns {{markdown: string, stats: Record<string, number>, problems: string[]}}
 */
export function buildFactsLayer(repoRoot, date) {
  const problems = [];
  const stats = {};
  const md = ['## Факты', ''];

  // 1) git-лог дня (детерминированный: границы суток UTC).
  let gitFacts = [];
  try {
    const log = execFileSync(
      'git',
      ['log', '--since', `${date}T00:00:00`, '--until', `${date}T23:59:59`, '--format=%H|%cI|%s'],
      { cwd: repoRoot, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    );
    gitFacts = factsFromGitLog(log);
  } catch (e) {
    problems.push(`git-лог: ${e.message}`);
  }
  stats.commits = gitFacts.length;
  md.push(...section(`Доставка (git, ${gitFacts.length})`, gitFacts.map(
    (f) => `- ${f.at} · ${f.sha}${f.pr ? ` · PR #${f.pr}` : ''} · ${f.subject}`,
  )));

  // 2) вещдоки дня.
  const readJsonl = (rel, atField, label, mapper) => {
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) {
      problems.push(`${label}: ${rel} отсутствует`);
      return [];
    }
    const { rows, problems: p } = jsonlForDate(readFileSync(abs, 'utf8'), date, atField);
    problems.push(...p.map((x) => `${label}: ${x}`));
    return rows.map(mapper);
  };
  const evidence = readJsonl('docs/evidence/registry.jsonl', 'addedAt', 'вещдоки',
    (j) => `- ${j.addedAt} · ${j.id} · sha256:${String(j.sha256 ?? '').slice(0, 12)}…${j.shown ? ' · показан (ShownMemo)' : ''}`);
  stats.evidence = evidence.length;
  md.push(...section(`Вещдоки (${evidence.length})`, evidence));

  // 3) кристаллы графа правды за дату (source.date).
  let crystals = [];
  try {
    const reg = JSON.parse(readFileSync(join(repoRoot, 'docs/truth/registry.json'), 'utf8'));
    const tokens = Array.isArray(reg) ? reg : (reg.tokens ?? []);
    crystals = tokens
      .filter((t) => t?.source?.date === date)
      .map((t) => `- ${t.source.date} · ${t.id} · класс ${t.class ?? t.source?.kind ?? '?'}`);
  } catch (e) {
    problems.push(`граф правды: ${e.message}`);
  }
  stats.crystals = crystals.length;
  md.push(...section(`Кристаллы (${crystals.length})`, crystals));

  // 4) долги: события леджера попугая за дату (глаголы M6).
  const debts = readJsonl('docs/bridge/debt-ledger.jsonl', 'at', 'долги',
    (j) => `- ${j.at} · ${j.verb} · ${j.id}${j.provenance ? ` · ${j.provenance}` : ''}`);
  stats.debtEvents = debts.length;
  md.push(...section(`Долги попугая (${debts.length})`, debts));

  // 5) квитанция мостика дня.
  const receiptRel = `docs/bridge/${date}/RECEIPT.md`;
  const receiptAbs = join(repoRoot, receiptRel);
  if (existsSync(receiptAbs)) {
    const body = readFileSync(receiptAbs, 'utf8').split(/\r?\n/).filter((l) => l.startsWith('- '));
    stats.receipt = 1;
    md.push(...section('Квитанция мостика', body.map((l) => `${l} _(из ${receiptRel})_`)));
  } else {
    stats.receipt = 0;
    md.push(...section('Квитанция мостика', ['- комната в этот день не закрывалась (квитанции нет)']));
  }

  // 6) отчёт памяти команды — итоговой строкой.
  const memRel = `docs/seanses/team-memory-report-${date}.md`;
  const memAbs = join(repoRoot, memRel);
  if (existsSync(memAbs)) {
    const summary = memoryReportSummary(readFileSync(memAbs, 'utf8'));
    stats.memoryReport = summary ? 1 : 0;
    md.push(...section('Память команды', summary ? [`- ${summary} _(из ${memRel})_`] : ['- отчёт есть, итоговая строка не распознана']));
    if (!summary) problems.push(`память: ${memRel} без строки «Итог:»`);
  } else {
    stats.memoryReport = 0;
    md.push(...section('Память команды', ['- отчёт за день ещё не создавался']));
  }

  return { markdown: md.join('\n'), stats, problems };
}
