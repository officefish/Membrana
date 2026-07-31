/**
 * ritual-deliver-to-main — verify gate tests (offline).
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import {
  checkArtifactDeliver,
  planDeliver,
  ritualConfig,
  runDeliverGate,
  verifyDeliverOnMain,
} from './lib/ritual-deliver-to-main.mjs';
import { MORNING_DELIVER_ARTIFACTS } from './lib/ritual-morning-artifacts.mjs';
import { parseDeliverArgs } from './ritual-deliver-to-main.mjs';

const TODAY = '2026-07-26';

function writeFresh(root, rel, bodyExtra = '') {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `# Title — ${TODAY}\n\n<!-- Сгенерировано: ${TODAY}T06:00:00.000Z (test) -->\n${bodyExtra}`,
    'utf8',
  );
}

test('parseDeliverArgs: flags', () => {
  assert.deepEqual(parseDeliverArgs(['--json', '--no-fetch']), {
    help: false,
    json: true,
    execute: false,
    noFetch: true,
    // Умолчание ритуала — утро: параметризация кадра доставки (Ф2 #1533) не имеет права
    // менять утренний вызов. Молчание = `day`, как было до расширения.
    ritual: 'day',
  });
});

test('parseDeliverArgs: --ritual выбирает ритуал, умолчание — утро', () => {
  assert.equal(parseDeliverArgs([]).ritual, 'day');
  assert.equal(parseDeliverArgs(['--ritual', 'evening']).ritual, 'evening');
  // Флаг без значения — отказ, а не тихий `day`: молчание проверило бы УТРЕННИЕ артефакты
  // под именем вечера. Найдено ревью блока 31.07.
  assert.throws(() => parseDeliverArgs(['--ritual']), /требует значения/u);
});

test('вечерний путь: даты резолвятся, читается манифест ВЕЧЕРА, не утра', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-evening-'));
  // Кладём ТОЛЬКО вечерний манифест: если движок полезет за утренним, кадр не найдётся
  // и тест упадёт — это и есть проверка «не читает чужой дом».
  const mrel = 'docs/procedures/ritual-evening/MANIFEST.json';
  mkdirSync(dirname(join(root, mrel)), { recursive: true });
  writeFileSync(
    join(root, mrel),
    JSON.stringify({ frames: [{ id: 'deliver-to-main', holder: 'angelina' }] }),
    'utf8',
  );
  const log = [];
  const code = runDeliverGate(root, { ritual: 'evening', today: TODAY, log: (s) => log.push(s) });
  assert.equal(code, 2, 'артефактов вечера нет — кадр обязан встать');
  const text = log.join('\n');
  assert.match(text, new RegExp(`docs/memos/${TODAY}\\.md`, 'u'), '<date> в путях обязан резолвиться');
  assert.match(text, /ritual-evening-/u, 'подсказка ветки — вечерняя, не утренняя');
  assert.match(text, /вечер не завершён/u, 'формулировка отказа — вечерняя');
  assert.doesNotMatch(text, /STRATEGY_DAY|DAILY_STANDUP/u, 'утренние артефакты в вечернем кадре не проверяются');
});

test('ritualConfig: неизвестный ритуал — ошибка входа, не тихий откат на утро', () => {
  // Молчаливый фолбэк проверил бы ЧУЖИЕ артефакты и назвал бы это «доставлено» —
  // ровно тот класс ложной зелёнки, ради которого спринт и начат.
  assert.throws(() => ritualConfig('обед'), /неизвестный ритуал/u);
  assert.equal(ritualConfig().branchSlug, 'ritual-day');
  assert.equal(ritualConfig('evening').branchSlug, 'ritual-evening');
});

test('checkArtifactDeliver: ok when local matches origin/main', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  writeFresh(root, 'docs/MAIN_DAY_ISSUE.md');
  const r = checkArtifactDeliver(root, 'docs/MAIN_DAY_ISSUE.md', TODAY, {
    readRemote: () => `# Title — ${TODAY}\n\n<!-- Сгенерировано: ${TODAY}T06:00:00.000Z (test) -->\n`,
  });
  assert.equal(r.status, 'ok');
});

test('checkArtifactDeliver: missing-on-main', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  writeFresh(root, 'docs/DAILY_STANDUP.md');
  const r = checkArtifactDeliver(root, 'docs/DAILY_STANDUP.md', TODAY, {
    readRemote: () => null,
  });
  assert.equal(r.status, 'missing-on-main');
});

test('checkArtifactDeliver: drift-from-main', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  writeFresh(root, 'docs/STRATEGY_DAY.md', 'local-only');
  const r = checkArtifactDeliver(root, 'docs/STRATEGY_DAY.md', TODAY, {
    readRemote: () => `# Title — ${TODAY}\n\n<!-- Сгенерировано: ${TODAY}T06:00:00.000Z (test) -->\nremote`,
  });
  assert.equal(r.status, 'drift-from-main');
});

test('verifyDeliverOnMain: all ok', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  const remote = new Map();
  for (const { rel } of MORNING_DELIVER_ARTIFACTS) {
    writeFresh(root, rel);
    remote.set(rel, readFileSync(join(root, rel), 'utf8'));
  }
  const v = verifyDeliverOnMain(root, {
    today: TODAY,
    readRemote: (rel) => remote.get(rel) ?? null,
  });
  assert.equal(v.ok, true);
});

test('planDeliver: noop vs pr:ship', () => {
  assert.equal(planDeliver([]).mode, 'noop');
  assert.equal(planDeliver(['docs/MAIN_DAY_ISSUE.md']).mode, 'pr:ship');
});

test('runDeliverGate: STOP without ritual-day manifest', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-empty-'));
  const code = runDeliverGate(root, { log: () => {} });
  assert.equal(code, 2);
});
