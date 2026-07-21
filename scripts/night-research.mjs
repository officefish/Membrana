/**
 * night-research CLI — ночной ресёрч-контур (#592, S6 / #598). Слой ПОВЕРХ night-hunt.
 *
 * Детерминированно выбирает пару кристаллов-сиблингов (сон системы), строит вопрос,
 * прогоняет через externalizeQuery, при живом ключе шлёт Perplexity (`perplexityAsk`)
 * и пишет docs/research/night/<date>-<slug>.md с фронтматтером
 * {topic, mode, origin, status, ttl}. status: checked | void | pending | rejected.
 * НЕ ставит adopted (владельческий гейт).
 *
 * Запуск:
 *   node scripts/night-research.mjs                 # seed = сегодняшняя дата
 *   node scripts/night-research.mjs --seed=2026-07-18
 *   node scripts/night-research.mjs --dry-run        # без сети (pending + пометка)
 *   node scripts/night-research.mjs --yield         # только метрика nightYield
 *   node scripts/night-research.mjs --sweep         # pending→void по TTL
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

import { loadDotEnv } from './_anthropic-env.mjs';
import { perplexityAsk } from './lib/insight-ritual.mjs';
import {
  pickTopic,
  renderNightArtifact,
  nightYield,
  effectiveStatus,
  classifyDreamAnswer,
} from './lib/night-research.mjs';
import { parseFrontmatter } from './lib/strategy-channels.mjs';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    `Usage: node scripts/night-research.mjs [--seed=YYYY-MM-DD] [--dry-run] [--yield] [--sweep] [--help]`,
  );
  process.exitCode = 0;
} else {
  await main();
}

async function main() {
  // PERPLEXITY_API_KEY живёт в корневом .env — без loadDotEnv прогон молча уйдёт в pending.
  loadDotEnv();

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
        return { status: fm.status ?? null, date: fm.date || (dm ? dm[1] : null), ttl: fm.ttl ?? null, file: f };
      });
  }

  /**
   * Перевести просроченные `pending` в `void` НА ДИСКЕ (#598). Без этого «честное нет»
   * оставалось бы вычисляемым, а в файлах вечно висел бы `pending` — то есть артефакт
   * продолжал бы утверждать, что вопрос в работе, спустя месяцы после срока.
   */
  function sweepExpired() {
    const nowMs = Date.parse(now);
    const changed = [];
    for (const a of readArtifacts()) {
      if (effectiveStatus(a, nowMs) !== 'void' || a.status === 'void') continue;
      const p = join(nightDir, a.file);
      const src = readFileSync(p, 'utf8');
      const out = src.replace(/^status:\s*pending\s*$/mu, 'status: void');
      if (out === src) continue; // фронтматтер не той формы — молча не правим
      writeFileSync(p, out, 'utf8');
      changed.push(`${a.file} (срок ${a.ttl ?? 14} дн. с ${a.date})`);
    }
    return changed;
  }

  if (argv.includes('--sweep')) {
    const changed = sweepExpired();
    for (const c of changed) console.log(`  pending → void: ${c}`);
    console.log(changed.length === 0 ? 'Просроченных снов нет.' : `Закрыто по сроку: ${changed.length}.`);
    return;
  }

  if (argv.includes('--yield')) {
    // Замер НЕ пишет на диск (замечание ревью): nightYield считает через effectiveStatus,
    // поэтому метрика верна и без развёртки — sweep здесь был бы побочкой чтения.
    const y = nightYield(readArtifacts(), { now });
    const pct = y.yield == null ? 'н/д (нет adopted+void за окно)' : `${(y.yield * 100).toFixed(0)}%`;
    console.log(`nightYield за ${y.window} дней: ${pct} (adopted=${y.adopted}, void=${y.void})`);
    return;
  }

  const seedArg = argv.find((a) => a.startsWith('--seed='));
  const seed = seedArg ? seedArg.slice('--seed='.length) : now.slice(0, 10);
  const dryRun = argv.includes('--dry-run');

  const registryPath = resolve(repoRoot, 'docs/truth/registry.json');
  if (!existsSync(registryPath)) {
    console.error('Граф правды не найден: docs/truth/registry.json. Ночной сон не из чего строить.');
    process.exitCode = 1;
    return;
  }
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

  /**
   * Словарь внутренних имён для гварда жаргона (#599): базовые имена скриптов из
   * `scripts/`. Берём только многосегментные (`main-day-issue`, не `verify`) — одиночное
   * слово слишком часто законно во внешнем вопросе, а составное имя скрипта наружу
   * утечь не может по смыслу. Читается из fs здесь, в обвязке: ядро остаётся чистым.
   */
  function repoInternalNames() {
    try {
      return readdirSync(resolve(repoRoot, 'scripts'))
        .filter((f) => f.endsWith('.mjs'))
        .map((f) => f.replace(/\.mjs$/u, ''))
        .filter((n) => n.includes('-') && !n.includes('.'));
    } catch {
      return []; // словаря нет — гвард работает по формальным правилам, не падает
    }
  }

  const topic = pickTopic(registry, { seed, internalNames: repoInternalNames() });
  if (!topic) {
    console.error('Нет пар кристаллов-сиблингов (derived с общим родителем) — сну не из чего родиться.');
    return;
  }

  const date = seed.slice(0, 10);
  /** @type {{status: 'pending'|'checked'|'void', body: string}|null} */
  let check = null;

  if (topic.rejected) {
    check = null; // renderNightArtifact сам поставит rejected
  } else if (dryRun) {
    check = {
      status: 'pending',
      body: '_(--dry-run: внешний поиск не выполнялся; статус остаётся `pending`)_',
    };
  } else {
    const apiKey = process.env.PERPLEXITY_API_KEY?.trim() || '';
    if (!apiKey) {
      check = {
        status: 'pending',
        body:
          '_(нет `PERPLEXITY_API_KEY` — поиск не выполнялся; вопрос выше готов для MCP/ручного прогона. ' +
          'Статус остаётся `pending`, не маскируем под `void`.)_',
      };
      console.error('⚠️  PERPLEXITY_API_KEY не задан — артефакт pending без проверки сна.');
    } else {
      try {
        const answer = await perplexityAsk(apiKey, topic.query);
        const verdict = classifyDreamAnswer(answer);
        const note =
          verdict.status === 'void'
            ? `**Вердикт: честное «снаружи пусто»** (${verdict.reason}).\n\n`
            : '**Вердикт: находка есть** (`status: checked`).\n\n';
        check = {
          status: verdict.status,
          body: `${note}${answer.trim()}\n\n_Источник: Perplexity \`sonar\`._`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        check = {
          status: 'pending',
          body:
            `> ⚠️ Perplexity недоступен: ${msg}\n>\n` +
            '> Артефакт оставлен `pending` (не `void`) — сбой сети ≠ честное «снаружи пусто».',
        };
        console.error(`⚠️  Perplexity failed: ${msg}`);
      }
    }
  }

  const outPath = join(nightDir, `${date}-${topic.slug}.md`);
  mkdirSync(nightDir, { recursive: true });
  writeFileSync(outPath, `${renderNightArtifact(topic, { date, ttlDays: 14 }, check)}\n`, 'utf8');

  console.error('Записано:', outPath);
  console.error(`Сон: ${topic.origin}`);
  if (topic.rejected) console.error(`⚠️  вопрос ОТКЛОНЁН (status=rejected): ${topic.rejectReason}`);
  else if (check) console.error(`Проверка сна: status=${check.status}`);
  else console.error(`Внешний вопрос: ${topic.query.slice(0, 100)}…`);
}
