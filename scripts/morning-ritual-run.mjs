#!/usr/bin/env node
/**
 * morning-ritual-run — обвязка фонового прохода утреннего ритуала (вердикт
 * morning-ritual-regulation 18.07). Читает манифест шагов + состояние решений,
 * идёт по mechanic-шагам, ЗАСТЫВАЕТ на первом гейте без решения (барьер из
 * lib/morning-ritual.mjs), печатает витрину + мостик в диалог + провенанс.
 *
 * НИЧЕГО НЕ РЕШАЕТ ЗА ВЛАДЕЛЬЦА: гейт (закрыть issue, отправить ласточку, магистраль,
 * owner-кристалл) фон физически не проходит — барьер держит на уровне ядра.
 *
 * Usage:
 *   node scripts/morning-ritual-run.mjs            — показать витрину + мостик (состояние)
 *   node scripts/morning-ritual-run.mjs --advance  — исполнить mechanic-шаги до барьера
 *   node scripts/morning-ritual-run.mjs --json      — состояние машинно
 *
 * Состояние решений: docs/tasks/morning-ritual-state.json {decisions:{gateId: value}}.
 * Владелец/ведущий агент пишет туда решение по гейту — тогда фон продвигается дальше.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { advanceFrontier, renderStatus, bridgeMessage, ritualStatus } from './lib/morning-ritual.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_REL = 'docs/tasks/morning-ritual-steps.json';
const STATE_REL = 'docs/tasks/morning-ritual-state.json';

// Маппинг mechanic-шаг → команда (какие шаги фон реально исполняет). Гейты команды
// не несут — их проходит владелец, не фон.
const MECHANIC_CMD = {
  'generate-horizon': ['node', ['scripts/strategy-day.mjs']],
  standup: ['node', ['scripts/daily-standup.mjs']],
  'probe-run': ['node', ['scripts/main-day-probe.mjs']],
  // sync-check / main-day-issue / owner-checklist / ally-swallow-draft —
  // требуют контекста ведущего агента (сводка, сборка черновиков), не голой команды.
};

function readJson(rel, fallback) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) return fallback;
  try { return JSON.parse(readFileSync(abs, 'utf8')); } catch { return fallback; }
}

/** Провенанс: ревизия, на которой фон отработал (против эхо — тот же снимок в N местах). */
function originHash() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch { return 'no-git'; }
}

function main() {
  const args = process.argv.slice(2);
  const doAdvance = args.includes('--advance');
  const asJson = args.includes('--json');

  const steps = readJson(MANIFEST_REL, { steps: [] }).steps ?? [];
  const state = readJson(STATE_REL, { decisions: {} });
  const rev = originHash();

  const { advanced, blockedAt, blockedReason } = advanceFrontier(steps, state);

  if (asJson) {
    process.stdout.write(JSON.stringify({ rev, advanced, blockedAt: blockedAt?.id ?? null, blockedReason, status: ritualStatus(steps, state) }, null, 2) + '\n');
    return;
  }

  console.log(`# Фоновый утренний ритуал @${rev}\n`);

  if (doAdvance) {
    // Исполнить mechanic-шаги ДО барьера. Гейт не трогаем — фон на нём застынет.
    for (let i = 0; i < advanced; i += 1) {
      const s = steps[i];
      const cmd = MECHANIC_CMD[s.id];
      if (!cmd) { console.log(`  · ${s.id}: механика ведущего агента (не голая команда) — пропуск в раннере`); continue; }
      try {
        console.log(`  ▸ ${s.id}: ${cmd[0]} ${cmd[1].join(' ')}`);
        execFileSync(cmd[0], cmd[1], { cwd: root, stdio: 'inherit' });
      } catch (e) {
        console.log(`  ✗ ${s.id}: упал (${(e.message || '').slice(0, 60)}) — фон останавливается, это находка, не clean`);
        break;
      }
    }
    console.log('');
  }

  console.log(renderStatus(steps, state));

  const bridge = bridgeMessage(steps, state);
  if (bridge) {
    console.log(`\n--- МОСТИК В ДИАЛОГ ---\n${bridge}`);
    process.exitCode = 0; // застыл на гейте — это НЕ ошибка, это ожидание владельца
  } else {
    console.log('\nВсе шаги пройдены — гейтов без решения нет.');
  }
}

main();
