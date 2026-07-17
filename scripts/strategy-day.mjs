/**
 * strategy-day — генератор стратегии дня (эпик #592). Детерминированный фронт: считает
 * ГОРИЗОНТ (дальние границы дня) из вехи + двух каналов и пишет docs/STRATEGY_DAY.md.
 * Не ходит в сеть, не зовёт LLM, не назначает исполнителей (Q1). Стратегия — ПЕРВАЯ в
 * ритуале: даёт MAIN_DAY_ISSUE цели над рутиной, а не список задач.
 *
 * Отличие от старого strategic-plan-day.mjs (LLM-план «на следующий день»): здесь нет
 * календарного nextDay (S2), горизонт меряется вехой, каналы читает ОДИН читатель (S4),
 * мёртвый канал печатается видимо, а не проглатывается.
 *
 * Запуск:
 *   node scripts/strategy-day.mjs
 *   node scripts/strategy-day.mjs --no-insights   # выключить канал инсайтов
 *   node scripts/strategy-day.mjs --no-research    # выключить канал ночного ресёрча
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import { makeHorizon, collectHorizonInputs } from './lib/strategy-horizon.mjs';
import {
  readHorizonChannels,
  readHorizonConfig,
  readTruthChannel,
  renderHorizonArtifact,
} from './lib/strategy-channels.mjs';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage: node scripts/strategy-day.mjs [--no-insights] [--no-research] [--help]

Пишет docs/STRATEGY_DAY.md — горизонт дня (веха + акценты каналов). Детерминированно,
без сети. Веха берётся из docs/strategy/day-horizon.json (ручной артефакт).`);
  process.exit(0);
}

const repoRoot = process.cwd();
const now = new Date().toISOString();

const config = readHorizonConfig(repoRoot);
if (!config) {
  // Не выдумываем веху молча — печатаем видимый setup-gap и выходим мягко (не падение).
  const msg =
    'Горизонт не задан: нет docs/strategy/day-horizon.json. Веха ставится человеком — ' +
    'создай конфиг {gate, phase, criteria[]}. Стратегия дня не может определить дальние границы без вехи.';
  console.error(msg);
  writeArtifact(`## Горизонт дня\n\n> ⚠️ ${msg}\n`);
  process.exit(0);
}

let horizon;
try {
  horizon = makeHorizon(config);
} catch (e) {
  console.error(`Конфиг горизонта невалиден: ${e.message}`);
  process.exit(1);
}

/** git log за окно вехи: [{date, files[]}] для isTimely (область молчит?). */
function collectGitLog(days = 14) {
  try {
    const out = execFileSync(
      'git',
      ['log', `--since=${days} days ago`, '--no-merges', '--date=iso-strict', '--name-only', '--pretty=format:@@@%ad'],
      { encoding: 'utf8', cwd: repoRoot, maxBuffer: 12 * 1024 * 1024 },
    );
    const commits = [];
    let cur = null;
    for (const line of out.split(/\r?\n/u)) {
      if (line.startsWith('@@@')) {
        if (cur) commits.push(cur);
        cur = { date: line.slice(3).trim(), files: [] };
      } else if (line.trim() && cur) {
        cur.files.push(line.trim());
      }
    }
    if (cur) commits.push(cur);
    return commits;
  } catch {
    return [];
  }
}

const channels = readHorizonChannels(repoRoot, {
  includeInsights: !argv.includes('--no-insights'),
  includeResearch: !argv.includes('--no-research'),
});

const gitLog = collectGitLog();

const { highlights, provenance } = collectHorizonInputs(horizon, channels, { now, gitLog });

// S7: стратегия читает граф правды — кристаллы как посылки горизонта (grep > 0).
const premises = readTruthChannel(repoRoot) ?? [];

const body = renderHorizonArtifact(horizon, { highlights, provenance, premises }, { now });
writeArtifact(body);

// Сводка в stderr — видимая, в т.ч. мёртвые каналы (не тишина).
for (const p of provenance) {
  if (!p.present) console.error(`⚠️  канал «${p.channel}»: ${p.note}`);
}
console.error(`Горизонт: gate=${horizon.gate} phase=${horizon.phase}; акцентов: ${highlights.length}`);

function writeArtifact(text) {
  const outputPath = resolve(repoRoot, 'docs/STRATEGY_DAY.md');
  const header =
    `<!-- Сгенерировано: ${now} (node scripts/strategy-day.mjs) -->\n` +
    `<!-- Детерминированный горизонт дня #592; без сети/LLM. Источник вехи: docs/strategy/day-horizon.json -->\n\n`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, header + text + '\n', 'utf8');
  console.error('Записано:', outputPath);
}
