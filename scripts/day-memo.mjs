#!/usr/bin/env node
/**
 * yarn day:memo — сборщик DAY_MEMO (фаза 2 магистрали 28.07; вердикт консилиума
 * day-memo-evening-2026-07-27, ратифицирован owner-choice@chat/magistral-28-07).
 *
 * Три слоя (контракт стыка фазы 1: build<Слой>Layer(repoRoot, date) →
 * {markdown, stats, problems[]}), сборка в один документ + хендофф-блок «что требует
 * утреннего внимания» → immutable-снапшот docs/memos/<date>.md → регистрация
 * вещдоком (sha256, append в docs/evidence/registry.jsonl тем же форматом, что
 * yarn evidence add). Слой агента не доставлен → секция «слой не поставлен», не
 * молчание и не падение. Персональный след уважает gated (#569): протокола показа
 * нет → след придерживается, публикуется хвостом вечера после ласточки.
 *
 * Exit: 0 — снапшот записан · 3 — записан с проблемами слоёв (находка) · 1 — сбой.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFactsLayer } from './lib/day-memo-facts.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argOf = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i !== -1 ? argv[i + 1] : null;
};

/** Слой из модуля агента: модуль ещё не доставлен → честная заглушка, не падение. */
async function optionalLayer(modulePath, fnName, date) {
  try {
    const m = await import(modulePath);
    return m[fnName](repoRoot, date);
  } catch (e) {
    const missing = e?.code === 'ERR_MODULE_NOT_FOUND';
    return {
      markdown: missing
        ? `_слой не поставлен (${fnName} — фаза 1 блок 2 в работе)_`
        : `_слой упал: ${e.message}_`,
      stats: {},
      problems: missing ? [] : [`${fnName}: ${e.message}`],
    };
  }
}

async function main() {
  const date = argOf('date') ?? new Date().toISOString().slice(0, 10);
  const memoRel = `docs/memos/${date}.md`;
  const memoAbs = join(repoRoot, memoRel);
  const regAbs = join(repoRoot, 'docs/evidence/registry.jsonl');
  if (existsSync(memoAbs) && !argv.includes('--force')) {
    // Идемпотентность (образец close мостика): снапшот дня уже есть — no-op, не failure.
    // Иначе вечерняя цепочка после ручного дневного прогона давала бы ложный красный.
    const registered = existsSync(regAbs) && readFileSync(regAbs, 'utf8').includes(`"id":"day-memo-${date}"`);
    console.log(`day-memo: ${memoRel} уже существует (immutable) — no-op; вещдок ${registered ? 'зарегистрирован' : 'НЕ зарегистрирован — проверить руками'}.`);
    if (!registered) process.exitCode = 3;
    return;
  }

  const facts = buildFactsLayer(repoRoot, date);
  const insights = await optionalLayer('./lib/day-memo-insights.mjs', 'buildInsightsLayer', date);
  const trace = await optionalLayer('./lib/day-memo-persona-trace.mjs', 'buildPersonaTraceLayer', date);

  // Гейт #569: след публикуется только после показа партнёрам (ласточка/фидбек дня).
  const gated = trace.stats?.gated === true;
  const traceBody = gated
    ? '_придержан гейтом #569: протокола показа партнёрам за день ещё нет — след допишется хвостом вечера_'
    : trace.markdown;

  const problems = [...facts.problems, ...insights.problems, ...(trace.problems ?? [])];
  const handoff = [
    '## Что требует утреннего внимания',
    '',
    ...(problems.length ? problems.map((p) => `- ${p}`) : ['- хвостов от сборки мемо нет']),
    ...(gated ? ['- персональный след придержан гейтом #569 — дописать после показа партнёрам'] : []),
    '',
  ];

  const doc = [
    `# DAY_MEMO — ${date}`,
    '',
    '<!-- канал: код — yarn day:memo (сборщик фазы 2); слои: факты=код, инсайты=цитатный v1, след=журналы персон -->',
    '',
    facts.markdown,
    '',
    '## Инсайты дня',
    '',
    insights.markdown,
    '',
    '## Персональный след',
    '',
    traceBody,
    '',
    ...handoff,
  ].join('\n');

  mkdirSync(dirname(memoAbs), { recursive: true });
  writeFileSync(memoAbs, doc, 'utf8');

  // Регистрация вещдоком: тот же формат записи, что yarn evidence add (append-only).
  const sha256 = createHash('sha256').update(doc, 'utf8').digest('hex');
  const record = {
    id: `day-memo-${date}`,
    sha256,
    bytes: Buffer.byteLength(doc, 'utf8'),
    addedAt: new Date().toISOString().slice(0, 10),
    source: `yarn day:memo — мемоизация дня ${date} (вердикт консилиума 27.07, магистраль 28.07)`,
    location: { kind: 'local', ref: memoRel },
    about: `DAY_MEMO ${date}: факты=${JSON.stringify(facts.stats)}; инсайты/след — по статусу слоёв`,
  };
  const already = existsSync(regAbs) && readFileSync(regAbs, 'utf8').includes(`"id":"day-memo-${date}"`);
  if (!already) appendFileSync(regAbs, JSON.stringify(record) + '\n', 'utf8');

  const layerStatus = (l, extra = null) =>
    l.markdown.includes('слой не поставлен') ? 'не поставлен' : (extra ?? 'ok');
  console.log(`day-memo → ${memoRel} · sha256:${sha256.slice(0, 12)}… · вещдок ${already ? 'уже был' : 'зарегистрирован'}`);
  console.log(`слои: факты ok · инсайты ${layerStatus(insights)} · след ${layerStatus(trace, gated ? 'придержан (#569)' : 'ok')}`);
  if (problems.length) {
    for (const p of problems) console.error(`  ⚠ ${p}`);
    process.exitCode = 3; // находка, не отказ
  }
}

main();
