#!/usr/bin/env node
/**
 * Сопровождение двухгейтового утра (M3-G + M4-H): решение владельца двигает фронтир.
 *
 *   yarn morning:gate status                                — где стоим, чего ждём
 *   yarn morning:gate freeze --top a,b,c                    — заморозить снимок топ-3
 *   yarn morning:gate magistral --choose <id>               — owner-choice магистрали
 *   yarn morning:gate swallow --draft <file>                — зафиксировать показанный черновик
 *   yarn morning:gate swallow --ack                         — явное «ок» владельца
 *
 * Состояние: docs/tasks/morning-gates-state.json (снимок заморожен на сессию утра).
 * Отправка НЕ здесь: send терминален и живёт за canSend (terminalSend).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

import { canSend, freezeTopThree, magistralChosen, swallowApproved } from './lib/morning-gates.mjs';

const STATE_PATH = resolve(process.cwd(), 'docs/tasks/morning-gates-state.json');
const argv = process.argv.slice(2);
const cmd = argv[0];
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : null;
};

function load() {
  if (!existsSync(STATE_PATH)) return {};
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}
function save(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

const state = load();

if (cmd === 'status' || !cmd) {
  const gate = canSend(state);
  console.log(`magistral: ${magistralChosen(state) ? `выбран «${state.magistral}»` : 'ждёт owner-choice'}`);
  console.log(`swallow:   ${swallowApproved(state) ? 'ок владельца получен' : 'ждёт (черновик + «ок»)'}`);
  console.log(gate.ok ? 'canSend: TRUE — отправка разрешена' : `canSend: false — ${gate.blockedBy.join(' · ')}`);
  process.exit(gate.ok ? 0 : 3);
}

if (cmd === 'freeze') {
  const ids = (arg('top') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0 || ids.length > 3) {
    console.error('morning:gate freeze --top a,b,c — от 1 до 3 кандидатов');
    process.exit(2);
  }
  Object.assign(state, freezeTopThree(ids), { magistral: null });
  save(state);
  console.log(`снимок топ-${ids.length} заморожен: ${ids.join(' · ')}`);
  process.exit(0);
}

if (cmd === 'magistral') {
  const choice = arg('choose');
  if (!choice) { console.error('нужен --choose <id>'); process.exit(2); }
  state.magistral = choice;
  if (!magistralChosen(state)) {
    console.error(`✖ «${choice}» ∉ замороженного снимка (${(state.magistralOptions ?? []).join(', ') || 'снимка нет — сначала freeze'}) — гейт закрыт`);
    process.exit(3);
  }
  save(state);
  console.log(`✓ магистраль выбрана владельцем: ${choice}`);
  process.exit(0);
}

if (cmd === 'swallow') {
  if (arg('draft')) {
    const p = resolve(process.cwd(), arg('draft'));
    if (!existsSync(p)) { console.error(`черновик не найден: ${arg('draft')}`); process.exit(2); }
    state.swallow = {
      ...(state.swallow ?? {}),
      draftDigest: createHash('sha256').update(readFileSync(p, 'utf8')).digest('hex'),
      draftFile: arg('draft'),
      ownerAck: false, // новый черновик сбрасывает старое «ок» — ок даётся на показанное
    };
    save(state);
    console.log(`черновик зафиксирован (digest ${state.swallow.draftDigest.slice(0, 8)}…); ждёт «ок» владельца`);
    process.exit(0);
  }
  if (argv.includes('--ack')) {
    if (!state.swallow?.draftDigest) {
      console.error('✖ «ок» без зафиксированного черновика не принимается (черновик обязан быть показан целиком ДО)');
      process.exit(3);
    }
    state.swallow.ownerAck = true;
    save(state);
    console.log('✓ «ок» владельца зафиксирован — swallow-гейт открыт');
    process.exit(0);
  }
  console.error('swallow: нужен --draft <file> или --ack');
  process.exit(2);
}

console.error(`неизвестная команда «${cmd}» (status | freeze | magistral | swallow)`);
process.exit(2);
