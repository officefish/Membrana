#!/usr/bin/env node
/**
 * yarn network:preflight — предполётная проверка ПЕРЕД внешним вызовом.
 * Отвечает на один вопрос: если сейчас упадёт — это сеть или не сеть?
 *
 *   yarn network:preflight [--profile <id>] [--emit-agent-block] [--from-snapshot]
 *
 * stdout — всегда JSON (агент ветвится по нему и по коду возврата, не по тексту).
 * Коды: 0 — всё зелёно · 10 — транспорт (сеть) · 20 — ключи · 30 — доступ/деньги/модель
 *       · 40 — не опознано · 2 — инструментальная ошибка.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildSnapshot, preflightExitCode, renderAgentBlock } from './lib/probe-core.mjs';
import { collectEnv } from './snapshot.mjs';
import { loadProfiles, repoRoot, runProbes } from './probe.mjs';

async function main() {
  const argv = process.argv.slice(2);
  const only = argv.includes('--profile') ? argv[argv.indexOf('--profile') + 1] : null;
  const now = new Date().toISOString();

  let snapshot;
  if (argv.includes('--from-snapshot')) {
    // Быстрый путь: не трогать сеть вовсе, прочитать последний снимок.
    const p = join(repoRoot, 'docs/network/env.snapshot.json');
    if (!existsSync(p)) {
      console.log(JSON.stringify({ ok: false, error: 'снимка нет — прогони yarn network:snapshot' }));
      return 2;
    }
    snapshot = JSON.parse(readFileSync(p, 'utf8'));
  } else {
    const profiles = loadProfiles().filter((x) => !only || x.id === only || x.role === 'control');
    if (profiles.length === 0) {
      console.log(JSON.stringify({ ok: false, error: `профиль «${only}» не найден` }));
      return 2;
    }
    snapshot = buildSnapshot({ probes: await runProbes({ profiles }), env: collectEnv(), generatedAt: now });
  }

  const code = preflightExitCode(snapshot);
  const agentBlock = renderAgentBlock(snapshot, now);

  if (argv.includes('--emit-agent-block')) {
    console.log(agentBlock);
    return code;
  }

  console.log(
    JSON.stringify(
      {
        ok: code === 0,
        exitCode: code,
        networkAtFault: snapshot.summary.networkAtFault,
        dominantOutcome: snapshot.summary.dominant,
        advice: snapshot.summary.advice,
        profiles: snapshot.probes.map((p) => ({ id: p.id, outcome: p.outcome, isTransport: p.isTransport, proxyMatters: p.proxyMatters })),
        agentBlockMd: agentBlock,
        generatedAt: snapshot.generatedAt,
      },
      null,
      2,
    ),
  );
  return code;
}

if (process.argv[1]?.endsWith('preflight.mjs')) process.exitCode = await main();
