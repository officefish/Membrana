#!/usr/bin/env node
/**
 * yarn llm-calls:snapshot --date YYYY-MM-DD
 * Тянет office day events (agent token) → dated analysis + обновляет registry Meta.
 * Сырые тела не пишутся (E1).
 *
 * Без token / сети: --from-fixture пишет specimen в analysis (dev).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveOfficeToken } from './lib/office-token.mjs';
import { loadDotEnv } from './_anthropic-env.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const house = join(repoRoot, 'docs', 'audit', 'llm-calls');

function parseArgs(argv) {
  let date = new Date().toISOString().slice(0, 10);
  let fromFixture = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--date' || a.startsWith('--date=')) {
      date = a.includes('=') ? a.split('=')[1] : argv[++i];
    } else if (a === '--from-fixture') {
      fromFixture = true;
    } else if (a === '--help' || a === '-h') {
      console.log('Usage: yarn llm-calls:snapshot [--date YYYY-MM-DD] [--from-fixture]');
      process.exitCode = 0;
      return null;
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error('date must be YYYY-MM-DD');
    process.exitCode = 2;
    return null;
  }
  return { date, fromFixture };
}

function forbiddenIn(obj) {
  for (const k of ['prompt', 'apiKey', 'rawResponse', 'messages', 'content']) {
    if (obj && typeof obj === 'object' && k in obj) return k;
  }
  return null;
}

const args = parseArgs(process.argv.slice(2));
if (!args) {
  /* help / bad date */
} else {
  loadDotEnv();
  /** @type {unknown[]} */
  let events = [];
  let source = 'office';

  if (args.fromFixture) {
    source = 'fixture';
    events = [
      {
        eventId: 'specimen-cr-openrouter-001',
        ts: `${args.date}T12:00:00.000Z`,
        procedureId: 'code-review',
        provider: 'openrouter',
        model: 'anthropic/claude-haiku-4.5',
        source: 'default',
        ok: true,
        latencyMs: 1,
        promptSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        responseSha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      },
    ];
  } else {
    const { token } = resolveOfficeToken(process.env);
    if (!token) {
      console.error('✖ нет office token; используйте --from-fixture или задайте OFFICE token в .env');
      process.exitCode = 2;
    } else {
      const base = (process.env.OFFICE_BASE_URL ?? 'https://office.mmbrn.tech').replace(/\/$/, '');
      const res = await fetch(`${base}/v1/llm-usage/day?date=${encodeURIComponent(args.date)}`, {
        headers: { 'x-membrana-token': token },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.error(`✖ office day HTTP ${res.status}`);
        process.exitCode = 1;
      } else {
        const data = await res.json();
        events = Array.isArray(data.recent) ? data.recent : [];
      }
    }
  }

  if (process.exitCode && process.exitCode !== 0) {
    /* already failed */
  } else {
    for (const ev of events) {
      const bad = forbiddenIn(ev);
      if (bad) {
        console.error(`✖ событие несёт запрещённое поле «${bad}» — abort`);
        process.exitCode = 1;
        break;
      }
    }
  }

  if (!process.exitCode || process.exitCode === 0) {
    const analysisDir = join(house, 'analysis');
    mkdirSync(analysisDir, { recursive: true });
    const analysisPath = join(analysisDir, `${args.date}-snapshot.md`);
    const rows = events
      .map((ev) => {
        const e = /** @type {Record<string, unknown>} */ (ev);
        return `| ${e.eventId ?? '—'} | ${e.ts ?? '—'} | ${e.procedureId ?? '—'} | ${e.provider ?? '—'} | ${e.model ?? '—'} | ${e.ok} | ${e.promptSha256 ?? '—'} | ${e.responseSha256 ?? '—'} | ${e.source ?? '—'} |`;
      })
      .join('\n');
    writeFileSync(
      analysisPath,
      `# llm-calls snapshot ${args.date}\n\nSource: ${source}\nCount: ${events.length}\n\n| eventId | ts | procedureId | provider | model | ok | promptSha256 | responseSha256 | source |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows || '| — | | | | | | | | |'}\n`,
      'utf8',
    );

    const registryPath = join(house, 'registry', 'LLM_CALLS_LIST.md');
    const list = `# LLM_CALLS_LIST — реестр доказательных гранул

## Meta

| Field | Value |
| --- | --- |
| Date | ${args.date} |
| Base | origin/main |
| Source | yarn llm-calls:snapshot (${source}) |
| Purpose | overwrite-реестр evidence minimum LPC |
| Sprint | llm-calls-house (#1033) |

## Summary

| Metric | Value |
| --- | --- |
| Granules | ${events.length} |
| Analysis | analysis/${args.date}-snapshot.md |

## Granules

| eventId | ts | procedureId | provider | model | ok | promptSha256 | responseSha256 | source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows || '| — | | | | | | | | |'}

## Notes

- Сырые тела запрещены (E1).
`;
    writeFileSync(registryPath, list, 'utf8');
    console.log(`snapshot ok date=${args.date} events=${events.length} → ${analysisPath}`);
  }
}
