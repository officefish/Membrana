/**
 * night-research CLI — ночной ресёрч-контур (#592, S6). Слой ПОВЕРХ night-hunt.
 *
 * Детерминированно выбирает пару кристаллов-сиблингов (сон системы), строит вопрос,
 * прогоняет через externalizeQuery и пишет docs/research/night/<date>-<slug>.md с
 * фронтматтером {topic, mode, origin, status, ttl}. НЕ ходит в сеть сам (внешний поиск
 * — отдельный шаг/human); НЕ ставит adopted (владельческий гейт).
 *
 * Запуск:
 *   node scripts/night-research.mjs                 # seed = сегодняшняя дата
 *   node scripts/night-research.mjs --seed=2026-07-18
 *   node scripts/night-research.mjs --yield         # только метрика nightYield
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

import { pickTopic, renderNightArtifact, nightYield } from './lib/night-research.mjs';
import { parseFrontmatter } from './lib/strategy-channels.mjs';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage: node scripts/night-research.mjs [--seed=YYYY-MM-DD] [--yield] [--help]`);
  process.exit(0);
}

const repoRoot = process.cwd();
const now = new Date().toISOString();
const nightDir = resolve(repoRoot, 'docs/research/night');

function readArtifacts() {
  if (!existsSync(nightDir)) return [];
  return readdirSync(nightDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = parseFrontmatter(readFileSync(join(nightDir, f), 'utf8'));
      const dm = f.match(/^(\d{4}-\d{2}-\d{2})-/u);
      return { status: fm.status ?? null, date: fm.date || (dm ? dm[1] : null), file: f };
    });
}

if (argv.includes('--yield')) {
  const y = nightYield(readArtifacts(), { now });
  const pct = y.yield == null ? 'н/д (нет adopted+void за окно)' : `${(y.yield * 100).toFixed(0)}%`;
  console.log(`nightYield за ${y.window} дней: ${pct} (adopted=${y.adopted}, void=${y.void})`);
  process.exit(0);
}

const seedArg = argv.find((a) => a.startsWith('--seed='));
const seed = seedArg ? seedArg.slice('--seed='.length) : now.slice(0, 10);

const registryPath = resolve(repoRoot, 'docs/truth/registry.json');
if (!existsSync(registryPath)) {
  console.error('Граф правды не найден: docs/truth/registry.json. Ночной сон не из чего строить.');
  process.exit(1);
}
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

const topic = pickTopic(registry, { seed });
if (!topic) {
  console.error('Нет пар кристаллов-сиблингов (derived с общим родителем) — сну не из чего родиться.');
  process.exit(0);
}

const date = seed.slice(0, 10);
const outPath = join(nightDir, `${date}-${topic.slug}.md`);
mkdirSync(nightDir, { recursive: true });
writeFileSync(outPath, renderNightArtifact(topic, { date, ttlDays: 14 }) + '\n', 'utf8');

console.error('Записано:', outPath);
console.error(`Сон: ${topic.origin}`);
if (topic.rejected) console.error(`⚠️  вопрос ОТКЛОНЁН (status=rejected): ${topic.rejectReason}`);
else console.error(`Внешний вопрос: ${topic.query.slice(0, 100)}…`);
