#!/usr/bin/env node
/**
 * yarn rt:day-report YYYY-MM-DD
 *
 * Берёт дату → фильтрует transitions[] за этот день →
 * для каждого узла собирает git diff stats → выдаёт два файла:
 *   docs/archive/rt-day-reports/<date>/DAY_GIT_FLOW.md
 *   docs/archive/rt-day-reports/<date>/DAY_COMPONENT_REPORT.json
 *
 * Токены = (linesAdded + linesDeleted) × TOKEN_COEFFICIENT (4 по умолчанию)
 * Consilium: docs/seanses/rt-day-report-спринт-скрипт-yarn-rt-day-report-2026-07-01.md
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TOKEN_COEFFICIENT = 4;

// ── CLI ──────────────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.log(`
RT DAY-REPORT — анализ дня из Research-Tree transitions

Usage:
  node scripts/rt-day-report.mjs YYYY-MM-DD

Examples:
  node scripts/rt-day-report.mjs 2026-05-13
  node scripts/rt-day-report.mjs 2026-06-13

Output:
  docs/archive/rt-day-reports/<date>/DAY_GIT_FLOW.md
  docs/archive/rt-day-reports/<date>/DAY_COMPONENT_REPORT.json

Tokens = (linesAdded + linesDeleted) × ${TOKEN_COEFFICIENT}
`);
  process.exit(0);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
if (!DATE_RE.test(arg)) {
  console.error(`❌ Неверный формат даты: "${arg}". Ожидается YYYY-MM-DD.`);
  process.exit(1);
}

const today = new Date().toISOString().split('T')[0];
if (arg > today) {
  console.error(`❌ Дата в будущем: "${arg}". Укажи дату не позже ${today}.`);
  process.exit(1);
}

const date = arg;

// ── Загрузка графа ───────────────────────────────────────────────────────────

const graphPath = path.join(ROOT, 'apps/demos/Research-Tree/membrana-knowledge-graph.json');
const graph = JSON.parse(readFileSync(graphPath, 'utf8'));

/** @type {Map<string, import('../apps/demos/Research-Tree/src/graph/types.js').KnowledgeNode>} */
const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));

const dayTransitions = (graph.transitions ?? []).filter(t => t.date === date);

if (dayTransitions.length === 0) {
  console.log(`ℹ️  Нет transitions[] для ${date} в графе. Нечего анализировать.`);
  process.exit(0);
}

console.log(`📅 ${date} — найдено ${dayTransitions.length} переход(ов) в transitions[]\n`);

// ── Git helpers ──────────────────────────────────────────────────────────────

function extractSHAs(note) {
  if (!note) return [];
  return [...note.matchAll(/\b([0-9a-f]{7,8})\b/g)].map(m => m[1]);
}

function gitShow(sha, format) {
  try {
    return execSync(`git show -s --format="${format}" ${sha}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function gitDiffStat(sha) {
  try {
    const out = execSync(`git show --numstat ${sha}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    let added = 0, deleted = 0;
    for (const line of out.split('\n')) {
      const m = line.match(/^(\d+)\t(\d+)\t/);
      if (m) { added += parseInt(m[1]); deleted += parseInt(m[2]); }
    }
    return { added, deleted };
  } catch {
    return { added: 0, deleted: 0 };
  }
}

// ── Сборка данных по узлам ───────────────────────────────────────────────────

const nodeReports = [];

for (const t of dayTransitions) {
  const node = nodeMap.get(t.nodeId);
  const shas = extractSHAs(t.note);

  let totalAdded = 0, totalDeleted = 0;
  let earliestTime = null;
  const commitMessages = [];

  if (shas.length === 0) {
    console.warn(`  ⚠️  ${t.id} (${t.nodeId}): нет SHA в note, метрики = 0`);
  }

  for (const sha of shas) {
    const stats = gitDiffStat(sha);
    totalAdded += stats.added;
    totalDeleted += stats.deleted;

    const ts = gitShow(sha, '%ai');
    if (ts && (!earliestTime || ts < earliestTime)) earliestTime = ts;

    const msg = gitShow(sha, '%s');
    if (msg) commitMessages.push(`${sha} — ${msg}`);

    console.log(`  ✓ ${t.nodeId} → ${t.to} | ${sha} | +${stats.added}/-${stats.deleted}`);
  }

  const tokens = (totalAdded + totalDeleted) * TOKEN_COEFFICIENT;

  nodeReports.push({
    transitionId: t.id,
    nodeId: t.nodeId,
    nodeName: node?.title ?? t.nodeId,
    epoch: node?.epoch ?? null,
    to: t.to,
    shas,
    commitMessages,
    note: t.note ?? null,
    linesAdded: totalAdded,
    linesDeleted: totalDeleted,
    tokens,
    time: earliestTime,
  });
}

// Хронологический порядок
nodeReports.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

// ── Итоговые метрики ─────────────────────────────────────────────────────────

const totalAdded   = nodeReports.reduce((s, n) => s + n.linesAdded, 0);
const totalDeleted = nodeReports.reduce((s, n) => s + n.linesDeleted, 0);
const totalTokens  = nodeReports.reduce((s, n) => s + n.tokens, 0);
const times        = nodeReports.map(n => n.time).filter(Boolean);
const firstTime    = times[0] ?? null;
const lastTime     = times[times.length - 1] ?? null;

const established  = nodeReports.filter(n => n.to === 'established');
const exploring    = nodeReports.filter(n => n.to === 'exploring');

function hhmm(iso) {
  return iso ? iso.substring(11, 16) : '—';
}

// ── DAY_COMPONENT_REPORT.json ─────────────────────────────────────────────────

const report = {
  date,
  tokenCoefficient: TOKEN_COEFFICIENT,
  summary: {
    totalNodes: nodeReports.length,
    established: established.length,
    exploring: exploring.length,
    totalLinesAdded: totalAdded,
    totalLinesDeleted: totalDeleted,
    totalLines: totalAdded + totalDeleted,
    totalTokens,
    timeFirst: firstTime,
    timeLast: lastTime,
  },
  nodes: nodeReports.map(n => ({
    transitionId: n.transitionId,
    nodeId: n.nodeId,
    nodeName: n.nodeName,
    epoch: n.epoch,
    to: n.to,
    linesAdded: n.linesAdded,
    linesDeleted: n.linesDeleted,
    tokens: n.tokens,
    commitSHAs: n.shas,
    commitMessages: n.commitMessages,
    time: n.time,
  })),
};

// ── DAY_GIT_FLOW.md ───────────────────────────────────────────────────────────

function nodeBlock(n) {
  const commits = n.commitMessages.length > 0
    ? n.commitMessages.map(c => `  - \`${c}\``).join('\n')
    : `  - (SHA не найден в note: ${n.note ?? 'нет данных'})`;
  return `### ${hhmm(n.time)} · **${n.nodeName}** → \`${n.to}\`
- Узел: \`${n.nodeId}\` (${n.epoch ?? '—'})
- Строк: +${n.linesAdded} / -${n.linesDeleted} → **~${n.tokens} токенов**
- Коммиты:
${commits}
`;
}

const epochGroups = [...new Set(nodeReports.map(n => n.epoch).filter(Boolean))];
const epochSummary = epochGroups.length > 0
  ? `Затронуто слоёв: ${epochGroups.join(', ')}.`
  : '';

const narrative = `# DAY_GIT_FLOW — ${date}

> Реконструкция по \`git log\` и \`transitions[]\` графа знаний Membrana Research-Tree.
> Сгенерировано: \`yarn rt:day-report ${date}\` · токены = строки × ${TOKEN_COEFFICIENT}.

---

## Сводка дня

| Метрика | Значение |
|---------|---------|
| Переходов в графе | ${nodeReports.length} |
| Закреплено (established) | ${established.length} |
| Начато (exploring) | ${exploring.length} |
| Строк добавлено | +${totalAdded} |
| Строк удалено | -${totalDeleted} |
| Всего строк | ${totalAdded + totalDeleted} |
| Оценка токенов | ~${totalTokens} |
| Период активности | ${hhmm(firstTime)} → ${hhmm(lastTime)} |

${epochSummary}

---

## Хронология переходов

${nodeReports.map(nodeBlock).join('\n')}

---

## Итоги

${established.length > 0 ? `**Закреплено (established):** ${established.map(n => `\`${n.nodeId}\``).join(', ')}` : ''}
${exploring.length > 0 ? `**Начато (exploring):** ${exploring.map(n => `\`${n.nodeId}\``).join(', ')}` : ''}

${
  established.length > 0
    ? `В этот день команда закрепила: **${established.map(n => n.nodeName).join(', ')}**.`
    : ''
}${
  exploring.length > 0
    ? ` Начаты первые шаги по: **${exploring.map(n => n.nodeName).join(', ')}**.`
    : ''
}
`;

// ── Запись файлов ─────────────────────────────────────────────────────────────

const outDir = path.join(ROOT, 'docs', 'archive', 'rt-day-reports', date);
mkdirSync(outDir, { recursive: true });

writeFileSync(path.join(outDir, 'DAY_GIT_FLOW.md'), narrative, 'utf8');
writeFileSync(path.join(outDir, 'DAY_COMPONENT_REPORT.json'), JSON.stringify(report, null, 2), 'utf8');

console.log(`
✅ Готово:
   ${outDir}/DAY_GIT_FLOW.md
   ${outDir}/DAY_COMPONENT_REPORT.json

📊 Сводка: ${nodeReports.length} узлов · +${totalAdded}/-${totalDeleted} строк · ~${totalTokens} токенов
   Период: ${hhmm(firstTime)} → ${hhmm(lastTime)}
`);
