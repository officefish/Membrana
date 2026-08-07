/**
 * ritual-deliver-to-main — verify gate tests (offline).
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import {
  DELIVERABLE_STATUSES,
  DELIVER_RITUALS,
  checkArtifactDeliver,
  guardDeliver,
  planDeliver,
  planExecute,
  ritualConfig,
  runDeliverGate,
  shipArgsFor,
  splitDeliverable,
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
  assert.match(text, /вечер не завершён/u, 'формулировка отказа — вечерняя');
  // Подсказки ветки здесь быть НЕ должно: файлов нет вовсе, доставке не подлежит ничего,
  // и печатать план `pr:ship` по отсутствующим путям значило бы вернуть неисполнимый план.
  // Вечерность самой подсказки покрыта зубом `ritualConfig`.
  assert.doesNotMatch(text, /доставить: pr:ship/u, 'нечего доставлять — плана доставки нет');
  assert.match(text, /вне доставки/u, 'непроизведённое обязано называться отдельно от недоставленного');
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

// ─── долг `#shown-is-not-delivered`: разделение статусов и исполнитель ─────────
//
// Замер 07.08: детектор был и был строгим, а вот исполнителя не было — `--execute`
// печатал «pr:ship через skill/owner; verify-only», и каждый стоп доводился руками
// (утро 07.08 и вечер 06.08 подряд). Отдельно: план валил все негодные статусы в один
// список путей, поэтому предлагал доставить три файла, которых на диске нет.

const report = (rel, status) => ({ rel, label: rel, status });

test('доставкой лечатся ровно два статуса: ствол не получил свежий файл', () => {
  assert.deepEqual([...DELIVERABLE_STATUSES], ['missing-on-main', 'drift-from-main']);
});

test('splitDeliverable: непроизведённое отделено от недоставленного', () => {
  const s = splitDeliverable([
    report('a.md', 'ok'),
    report('b.md', 'missing-on-main'),
    report('c.md', 'drift-from-main'),
    report('d.md', 'missing-local'),
    report('e.md', 'stale'),
  ]);
  assert.deepEqual(s.deliverable.map((r) => r.rel), ['b.md', 'c.md']);
  assert.deepEqual(s.blocked.map((r) => r.rel), ['d.md', 'e.md']);
});

test('planExecute: всё на main — noop, доставлять нечего', () => {
  const p = planExecute([report('a.md', 'ok')]);
  assert.equal(p.action, 'noop');
  assert.deepEqual(p.paths, []);
});

test('planExecute: только непроизведённое — доставка НЕ запускается', () => {
  const p = planExecute([report('d.md', 'missing-local'), report('e.md', 'stale')]);
  assert.equal(p.action, 'nothing-to-deliver');
  assert.deepEqual(p.paths, []);
  assert.match(p.reason, /не лечится/u);
});

test('planExecute: готовое доставляется, даже если соседнее не произведено', () => {
  // Несущее решение: отказ ронять готовое из-за чужого пропуска сохранил бы ровно тот
  // дефект, против которого долг. Ложной зелёнки нет — вердикт считается заново.
  const p = planExecute([report('b.md', 'missing-on-main'), report('d.md', 'missing-local')], 'evening');
  assert.equal(p.action, 'deliver');
  assert.deepEqual(p.paths, ['b.md']);
  assert.deepEqual(p.blocked.map((r) => r.rel), ['d.md']);
  assert.match(p.branchHint, /ritual-evening-/u, 'подсказка ветки — вечерняя');
});

test('planExecute: подсказка ветки берётся по ритуалу, не по умолчанию', () => {
  assert.match(planExecute([report('b.md', 'missing-on-main')], 'day').branchHint, /ritual-day-/u);
});

test('гейт печатает ИСПОЛНИМЫЙ план: путь к доставке и команду исполнителя', () => {
  const root = mkdtempSync(join(tmpdir(), 'deliver-exec-'));
  const mrel = 'docs/procedures/ritual-evening/MANIFEST.json';
  mkdirSync(dirname(join(root, mrel)), { recursive: true });
  writeFileSync(join(root, mrel), JSON.stringify({ frames: [{ id: 'deliver-to-main', holder: 'angelina' }] }), 'utf8');
  // Один артефакт есть локально и свеж, ствол его не получил → доставке подлежит.
  writeFresh(root, `docs/memos/${TODAY}.md`);

  const log = [];
  const code = runDeliverGate(root, {
    ritual: 'evening',
    today: TODAY,
    readRemote: () => null,
    log: (s) => log.push(s),
  });
  const text = log.join('\n');
  assert.equal(code, 2, 'остальные артефакты не произведены — кадр всё равно красный');
  assert.match(text, /доставить: pr:ship paths=\[docs\/memos\//u, 'готовое обязано попасть в план доставки');
  assert.match(text, /ritual-evening-/u, 'подсказка ветки — вечерняя');
  assert.match(text, /исполнить: yarn ritual:deliver-to-main --ritual evening --execute/u,
    'план обязан называть команду, которая его доводит');
  assert.match(text, /вне доставки/u, 'непроизведённое названо отдельно');
});

test('--json несёт ритуал: вечерний запрос не отвечает утренними артефактами', () => {
  // Без передачи ritual сюда `--json --ritual evening` проверял утренние документы и звал
  // это вердиктом вечера — ложная зелёнка ровно того класса, что и молчаливый фолбэк.
  const root = mkdtempSync(join(tmpdir(), 'deliver-json-'));
  const v = verifyDeliverOnMain(root, { ritual: 'evening', today: TODAY, readRemote: () => null });
  const rels = v.reports.map((r) => r.rel).join(' ');
  assert.doesNotMatch(rels, /STRATEGY_DAY|DAILY_STANDUP/u);
  assert.match(rels, new RegExp(`docs/memos/${TODAY}\.md`, 'u'));
});

test('guardDeliver: путь вне манифеста ритуала — отказ, а не «по построению не бывает»', () => {
  const g = guardDeliver({ paths: ['docs/memos/x.md', 'packages/core/src/index.ts'], declared: ['docs/memos/x.md'], staged: [] });
  assert.equal(g.ok, false);
  assert.match(g.refusal, /вне манифеста/u);
  assert.deepEqual(g.offenders, ['packages/core/src/index.ts']);
});

test('guardDeliver: чужое в индексе — отказ: git commit берёт индекс, а не наши пути', () => {
  const g = guardDeliver({
    paths: ['docs/memos/x.md'],
    declared: ['docs/memos/x.md'],
    staged: ['docs/memos/x.md', 'packages/core/src/secret.ts'],
  });
  assert.equal(g.ok, false);
  assert.match(g.refusal, /в индексе чужое/u);
  assert.deepEqual(g.offenders, ['packages/core/src/secret.ts']);
});

test('guardDeliver: свои пути в индексе доставке не мешают', () => {
  const g = guardDeliver({ paths: ['a.md', 'b.md'], declared: ['a.md', 'b.md', 'c.md'], staged: ['a.md'] });
  assert.equal(g.ok, true);
});

test('guardDeliver: пустой индекс законен — артефакты могли быть уже закоммичены локально', () => {
  assert.equal(guardDeliver({ paths: ['a.md'], declared: ['a.md'], staged: [] }).ok, true);
});

test('shipArgsFor: ревью прогоняется гейтом, а не обходится', () => {
  const a = shipArgsFor({ ritual: 'evening', today: TODAY, branch: 'b', hasStaged: true });
  assert.ok(a.includes('--with-review'), 'без флага исполнитель встал бы на ревью-гейте, как человек');
  assert.ok(a.includes('--execute'));
  assert.ok(!a.includes('--no-commit'), 'индекс не пуст — коммит нужен');
  assert.deepEqual([a[a.indexOf('--type') + 1], a[a.indexOf('--scope') + 1]], ['chore', 'ritual']);
  assert.match(a[a.indexOf('--message') + 1], new RegExp(`вечер ${TODAY}`, 'u'));
});

test('shipArgsFor: пустой индекс → --no-commit (артефакты уже закоммичены локально)', () => {
  // Самый частый случай долга: файлы лежат в коммите на ветке, но ствол их не получил.
  // Без этого флага pr:ship падает на «nothing to commit», то есть исполнитель ломался бы
  // именно там, где долг живёт.
  const a = shipArgsFor({ ritual: 'day', today: TODAY, branch: 'b', hasStaged: false });
  assert.ok(a.includes('--no-commit'));
  assert.match(a[a.indexOf('--message') + 1], new RegExp(`утро ${TODAY}`, 'u'));
});
