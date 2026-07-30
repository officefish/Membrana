#!/usr/bin/env node
/**
 * Собственная дверь вечернего ритуала (#1475).
 *
 *   yarn evening:gate status
 *   yarn evening:gate partner-swallow --draft <file>
 *   yarn evening:gate partner-swallow --ack
 *
 * Отправка НЕ здесь: `telegram:swallow` остаётся терминальным действием и сверяет
 * day + ack + digest. Этот CLI только фиксирует ручной owner-gate вечера.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  approveEveningPartnerDraft,
  canSendEveningPartnerSwallow,
  recordEveningPartnerDraft,
} from './lib/evening-gates.mjs';
import { todayIso } from './lib/morning-gates.mjs';
import { checkSwallowDraft } from './lib/swallow-mirror.mjs';

export const EVENING_GATES_STATE_REL = 'docs/tasks/morning-gates-state.json';

const STATE_PATH = resolve(process.cwd(), EVENING_GATES_STATE_REL);

export function parseEveningGateArgs(argv) {
  const cmd = argv[0] ?? 'status';
  const subcmd = cmd === 'swallow' ? 'partner-swallow' : cmd;
  const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 ? argv[i + 1] : null;
  };
  return {
    cmd: subcmd,
    draft: flag('draft'),
    ack: argv.includes('--ack'),
  };
}

function load() {
  if (!existsSync(STATE_PATH)) return {};
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

function save(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function gatePath(file = '<file>') {
  return `yarn evening:gate partner-swallow --draft ${file} → показать капитану → yarn evening:gate partner-swallow --ack → yarn telegram:swallow --file ${file}`;
}

function main() {
  const args = parseEveningGateArgs(process.argv.slice(2));
  const today = todayIso();
  let state = load();

  if (args.cmd === 'status') {
    const payload = state?.swallow?.draftFile && existsSync(resolve(process.cwd(), state.swallow.draftFile))
      ? readFileSync(resolve(process.cwd(), state.swallow.draftFile), 'utf8')
      : '';
    const gate = canSendEveningPartnerSwallow(state, today, payload);
    console.log(`evening: ${state.day ?? '—'} (сегодня ${today}${state.day && state.day !== today ? ' — ПРОТУХЛО' : ''})`);
    console.log(`partner-swallow: ${gate.ok ? 'ок владельца + digest свежие' : gate.blockedBy.join(' · ')}`);
    console.log(`resume: ${gate.ok ? 'yarn telegram:swallow --file ' + state.swallow.draftFile : gatePath()}`);
    process.exitCode = gate.ok ? 0 : 3;
    return;
  }

  if (args.cmd !== 'partner-swallow') {
    console.error(`evening:gate — неизвестная команда «${args.cmd}» (status | partner-swallow)`);
    process.exitCode = 2;
    return;
  }

  if (args.draft) {
    const p = resolve(process.cwd(), args.draft);
    if (!existsSync(p)) {
      console.error(`✖ evening:gate partner-swallow — черновик не найден: ${args.draft}`);
      console.error(`resume: ${gatePath(args.draft)}`);
      process.exitCode = 2;
      return;
    }
    const draftText = readFileSync(p, 'utf8');
    const clean = checkSwallowDraft(draftText);
    if (!clean.ok) {
      console.error('✖ evening:gate partner-swallow — черновик не прошёл зеркало/чистоту:');
      for (const v of clean.violations) console.error(`  · ${v}`);
      console.error(`resume: исправить текст → ${gatePath(args.draft)}`);
      process.exitCode = 3;
      return;
    }
    state = recordEveningPartnerDraft(state, { draftText, draftFile: args.draft, today });
    save(state);
    console.log(`✓ вечерний черновик зафиксирован на ${today} (digest ${state.swallow.draftDigest.slice(0, 8)}…); ждёт «ок» владельца`);
    console.log(`resume: yarn evening:gate partner-swallow --ack`);
    return;
  }

  if (args.ack) {
    const verdict = approveEveningPartnerDraft(state, today);
    if (!verdict.ok) {
      console.error('✖ evening:gate partner-swallow — «ок» не принят:');
      for (const b of verdict.blockedBy) console.error(`  · ${b}`);
      console.error(`resume: ${gatePath(state?.swallow?.draftFile ?? '<file>')}`);
      process.exitCode = 3;
      return;
    }
    save(verdict.state);
    console.log('✓ «ок» владельца зафиксирован — вечерний partner-swallow открыт');
    console.log(`resume: yarn telegram:swallow --file ${verdict.state.swallow.draftFile}`);
    return;
  }

  console.error('evening:gate partner-swallow — нужен --draft <file> или --ack');
  console.error(`resume: ${gatePath()}`);
  process.exitCode = 2;
}

if (process.argv[1]?.endsWith('evening-gate.mjs')) main();

