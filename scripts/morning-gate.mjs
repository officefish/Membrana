#!/usr/bin/env node
/**
 * Сопровождение двухгейтового утра (M3-G + M4-H): решение владельца двигает фронтир.
 *
 *   yarn morning:gate status                                — где стоим, чего ждём
 *   yarn morning:gate freeze --top a,b,c                    — заморозить снимок топ-3
 *   yarn morning:gate magistral --choose <id>               — owner-choice магистрали
 *   yarn morning:gate swallow --skeleton                    — шаблон-зеркало ласточки (Ф2 #788)
 *   yarn morning:gate swallow --draft <file>                — зафиксировать показанный черновик (гейт зеркала/чистоты)
 *   yarn morning:gate swallow --ack                         — явное «ок» владельца
 *
 * Состояние: docs/tasks/morning-gates-state.json (снимок заморожен на сессию утра).
 * Отправка НЕ здесь: send терминален и живёт за canSend / canSendAlly (#1233).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  canSend,
  draftDigestOf,
  freezeTopThree,
  magistralChosen,
  swallowApproved,
  todayIso,
} from './lib/morning-gates.mjs';
import { buildSwallowSkeleton, checkSwallowDraft } from './lib/swallow-mirror.mjs';

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

const today = todayIso();
const state = load();

if (cmd === 'status' || !cmd) {
  const gate = canSend(state, today);
  console.log(`day:      ${state.day ?? '—'} (сегодня ${today}${state.day && state.day !== today ? ' — ПРОТУХЛО' : ''})`);
  console.log(`magistral: ${magistralChosen(state, today) ? `выбран «${state.magistral}»` : 'ждёт owner-choice'}`);
  console.log(`swallow:   ${swallowApproved(state, today) ? 'ок владельца получен' : 'ждёт (черновик + «ок»)'}`);
  console.log(gate.ok ? 'canSend: TRUE — отправка разрешена' : `canSend: false — ${gate.blockedBy.join(' · ')}`);
  process.exitCode = gate.ok ? 0 : 3;
} else if (cmd === 'freeze') {
  const ids = (arg('top') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0 || ids.length > 3) {
    console.error('morning:gate freeze --top a,b,c — от 1 до 3 кандидатов');
    process.exitCode = 2;
  } else {
    Object.assign(state, freezeTopThree(ids, today), { magistral: null, swallow: null });
    save(state);
    console.log(`снимок топ-${ids.length} заморожен на ${today}: ${ids.join(' · ')}`);
  }
} else if (cmd === 'magistral') {
  const choice = arg('choose');
  if (!choice) {
    console.error('нужен --choose <id>');
    process.exitCode = 2;
  } else {
    state.magistral = choice;
    // day мог отсутствовать у старого файла — без сегодняшнего дня выбор не «живой»
    if (!state.day) state.day = today;
    if (!magistralChosen(state, today)) {
      console.error(
        `✖ «${choice}» ∉ замороженного снимка сегодня (${(state.magistralOptions ?? []).join(', ') || 'снимка нет — сначала freeze'}) — гейт закрыт`,
      );
      process.exitCode = 3;
    } else {
      save(state);
      console.log(`✓ магистраль выбрана владельцем: ${choice}`);
      // T7 (шторм 21.07, Ф1 #788): касание 1 закрыто → фон сразу собирает доклад по
      // задачам. Exit-код команды magistral отражает ЧЕКАНКУ (уже сохранена), а не
      // доклад: доклад — best-effort с ручным перезапуском, красный доклад не должен
      // рушить вызывающую цепочку и тем более откатывать выбор владельца.
      const report = spawnSync(process.execPath, ['scripts/day-report.mjs'], { stdio: 'inherit' });
      if (report.status !== 0) {
        console.error('⚠ доклад по задачам не собрался — чеканка в силе; перезапуск: yarn day:report');
      }
    }
  }
} else if (cmd === 'swallow') {
  if (argv.includes('--skeleton')) {
    console.log(buildSwallowSkeleton());
  } else if (arg('draft')) {
    const p = resolve(process.cwd(), arg('draft'));
    if (!existsSync(p)) {
      console.error(`черновик не найден: ${arg('draft')}`);
      process.exitCode = 2;
    } else {
      const draftText = readFileSync(p, 'utf8');
      // Ф2 #788 (T8/T10): структурный гейт Ангелины — вода/жаргон не фиксируются.
      const clean = checkSwallowDraft(draftText);
      if (!clean.ok) {
        console.error('✖ черновик не прошёл гейт зеркала/чистоты:');
        for (const v of clean.violations) console.error(`  · ${v}`);
        console.error('Шаблон: yarn morning:gate swallow --skeleton');
        process.exitCode = 3;
      } else {
        state.day = today; // новый черновик = сегодняшний след (#1233)
        state.swallow = {
          ...(state.swallow ?? {}),
          draftDigest: draftDigestOf(draftText),
          draftFile: arg('draft'),
          ownerAck: false, // новый черновик сбрасывает старое «ок» — ок даётся на показанное
        };
        save(state);
        console.log(
          `черновик зафиксирован на ${today} (digest ${state.swallow.draftDigest.slice(0, 8)}…); ждёт «ок» владельца`,
        );
      }
    }
  } else if (argv.includes('--ack')) {
    if (!state.swallow?.draftDigest) {
      console.error('✖ «ок» без зафиксированного черновика не принимается (черновик обязан быть показан целиком ДО)');
      process.exitCode = 3;
    } else if (!dayFreshOrRepair(state, today)) {
      console.error(
        `✖ «ок» на протухшем состоянии (day=${state.day ?? '—'}, сегодня ${today}) — сначала --draft сегодняшнего черновика`,
      );
      process.exitCode = 3;
    } else {
      state.swallow.ownerAck = true;
      save(state);
      console.log('✓ «ок» владельца зафиксирован — swallow-гейт открыт на сегодня');
    }
  } else {
    console.error('swallow: нужен --draft <file> или --ack');
    process.exitCode = 2;
  }
} else {
  console.error(`неизвестная команда «${cmd}» (status | freeze | magistral | swallow)`);
  process.exitCode = 2;
}

/** Ack не продлевает чужой день: day обязан уже быть сегодня (ставится на --draft/--freeze). */
function dayFreshOrRepair(state, today) {
  return state?.day === today;
}
