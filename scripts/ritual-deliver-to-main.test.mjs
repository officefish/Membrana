/**
 * ritual-deliver-to-main — verify gate tests (offline).
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import {
  DELIVER_RITUALS,
  checkArtifactDeliver,
  planDeliver,
  ritualConfig,
  runDeliverGate,
  verifyDeliverOnMain,
} from './lib/ritual-deliver-to-main.mjs';
import { eveningDeliverArtifacts } from './lib/ritual-evening-artifacts.mjs';
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

// --- Условная позиция кадра доставки вечера (спринт `evening-deliver-frame-fix`, блок
// `deliver-frame-teeth`). Первый настоящий прогон кадра 01.08 показал, что он непроходим в
// принципе: из шести позиций доставкой лечились две.
//
// НЕСУЩИЙ СЛУЧАЙ — второй тест ниже. Резчик дал BLOCK на первую редакцию лечения со словами
// «условность — способ гасить проверки, когда неудобно», и был прав: предикат смотрел на сам
// файл, то есть проверка отменялась тем же, чего касается. Условие переведено на независимого
// свидетеля — состояние мостика. Зуб закрепляет, что свидетель работает В ОБЕ стороны:
// мостик открывали, конспекта нет → находка, а не поблажка.

const BRIDGE_SPEC = [
  {
    rel: `docs/bridge/${TODAY}/CONSPECTUS.md`,
    label: 'конспект мостика',
    dated: true,
    when: 'bridge-open',
  },
];

function writeBridgeState(root, day) {
  const abs = join(root, 'docs/bridge/state.json');
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify({ phase: 'sealed', day, openedBy: 'cap' }), 'utf8');
}

// Условность живёт в конфигурации вечера, а не в записи артефакта и не в общем движке —
// разбор структурщика и архитектора. Поэтому проверяется она НА СПИСКЕ, который отдаёт
// процедура: не «позиция вернула ok», а «позиции в списке нет».
const eveningArtifacts = (root, date) => DELIVER_RITUALS.evening.artifacts(date, { repoRoot: root });
const hasConspectus = (list) => list.some((a) => a.rel.includes('CONSPECTUS'));

test('условная позиция: мостик не открывали — позиция не спрашивается вовсе', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  writeBridgeState(root, '2026-07-20');
  assert.equal(hasConspectus(eveningArtifacts(root, TODAY)), false);
});

test('условная позиция: мостик открывали — позиция в списке, спрашивается наравне', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  writeBridgeState(root, TODAY);
  assert.equal(hasConspectus(eveningArtifacts(root, TODAY)), true);
});

test('свидетель нечитаем — позиция остаётся в списке, а не гаснет молча', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  const abs = join(root, 'docs/bridge/state.json');
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, '{ битый', 'utf8');
  assert.equal(hasConspectus(eveningArtifacts(root, TODAY)), true);
});

test('НЕСУЩИЙ: мостик ОТКРЫВАЛИ, конспекта нет — находка, а не поблажка', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  writeBridgeState(root, TODAY);
  const r = checkArtifactDeliver(root, BRIDGE_SPEC[0].rel, TODAY, {
    artifacts: BRIDGE_SPEC,
    readRemote: () => null,
  });
  assert.equal(r.status, 'missing-local');
});

test('условная позиция: мостик открывали, конспект есть — проверяется наравне со всеми', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  writeBridgeState(root, TODAY);
  const abs = join(root, BRIDGE_SPEC[0].rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `# Конспект\n\n<!-- Сгенерировано: ${TODAY}T06:00:00.000Z (test) -->\n`, 'utf8');
  const r = checkArtifactDeliver(root, BRIDGE_SPEC[0].rel, TODAY, {
    artifacts: BRIDGE_SPEC,
    readRemote: () => null,
  });
  assert.equal(r.status, 'missing-on-main');
});

test('свидетель нечитаем — позиция проверяется, а не отключается', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  const abs = join(root, 'docs/bridge/state.json');
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, '{ битый', 'utf8');
  const r = checkArtifactDeliver(root, BRIDGE_SPEC[0].rel, TODAY, {
    artifacts: BRIDGE_SPEC,
    readRemote: () => null,
  });
  // Неизвестность оборачивается проверкой, а не поблажкой: иначе битый файл состояния
  // молча отключал бы позицию — тот же затвор, только спрятанный глубже.
  assert.equal(r.status, 'missing-local');
});

test('свидетеля нет вовсе — позиция проверяется', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-'));
  const r = checkArtifactDeliver(root, BRIDGE_SPEC[0].rel, TODAY, {
    artifacts: BRIDGE_SPEC,
    readRemote: () => null,
  });
  assert.equal(r.status, 'missing-local');
});

test('резолвер отдаёт РОВНО три поля — служебное не просочится в ствол', () => {
  // Требование структурщика: явный выбор вместо спреда. Спред копировал бы всё, что появится
  // в записи завтра, и лишнее уехало бы в доставку молча.
  const resolved = eveningDeliverArtifacts(TODAY);
  for (const a of resolved) {
    assert.deepEqual(Object.keys(a).sort(), ['dated', 'label', 'rel']);
  }
});

test('опись снимка дня вынута из списка: вторая форма провенанса не заводится', () => {
  const resolved = eveningDeliverArtifacts(TODAY);
  assert.ok(!resolved.some((a) => a.rel.includes('manifest.json')));
});
