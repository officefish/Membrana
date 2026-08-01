import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FINDING_KINDS,
  PENDING_REASONS,
  VERDICTS,
  auditWires,
  checkWire,
  extractCarrierPaths,
  pendingEntryProblems,
  pendingExpired,
  splitComposite,
} from './lib/dead-wire.mjs';
import { runCheck } from './dead-wire-check.mjs';

const TODAY = '2026-08-01';
const alive = () => true;
const dead = () => false;

// ── извлечение носителя ──────────────────────────────────────────────────────

test('составная команда отдаёт все носители, а не первый', () => {
  const paths = extractCarrierPaths('node scripts/a.mjs && turbo run build | node ./scripts/b.mjs');
  assert.deepEqual(paths, ['scripts/a.mjs', 'scripts/b.mjs']);
});

test('команды без файлового носителя носителей не дают', () => {
  for (const cmd of ['turbo run build', 'yarn workspace @m/core build', 'tsc -p .', 'echo ok']) {
    assert.deepEqual(extractCarrierPaths(cmd), [], cmd);
  }
});

test('префикс переменных окружения не прячет носитель', () => {
  assert.deepEqual(extractCarrierPaths('NODE_ENV=prod node scripts/x.mjs'), ['scripts/x.mjs']);
});

test('флаги раннера не принимаются за путь', () => {
  assert.deepEqual(extractCarrierPaths('node --test scripts/y.test.mjs'), ['scripts/y.test.mjs']);
});

test('splitComposite режет по операторам оболочки', () => {
  assert.deepEqual(splitComposite('a && b || c ; d | e'), ['a', 'b', 'c', 'd', 'e']);
});

// ── оба пути предиката ───────────────────────────────────────────────────────

test('путь 1: носитель на месте — находки нет', () => {
  const found = checkWire({
    name: 'live', command: 'node scripts/live.mjs', fileExists: alive, pending: {}, today: TODAY,
  });
  assert.deepEqual(found, []);
});

test('путь 2: носителя нет и записи pending нет — dead_wire', () => {
  const found = checkWire({
    name: 'night:run', command: 'node scripts/night-build-run-phase.mjs',
    fileExists: dead, pending: {}, today: TODAY,
  });
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'dead_wire');
  assert.equal(found[0].carrier, 'scripts/night-build-run-phase.mjs');
});

test('легальное «нет с причиной»: валидный непросроченный pending находки не даёт', () => {
  const found = checkWire({
    name: 'later', command: 'node scripts/later.mjs', fileExists: dead,
    pending: { later: { reason: 'awaits-implementation', until: '2026-09-01' } }, today: TODAY,
  });
  assert.deepEqual(found, []);
});

// ── каждый род находки поимённо ──────────────────────────────────────────────

test('род pending_invalid: причина вне закрытого перечня', () => {
  const found = checkWire({
    name: 'x', command: 'node scripts/x.mjs', fileExists: dead,
    pending: { x: { reason: 'потому что', until: '2026-09-01' } }, today: TODAY,
  });
  assert.equal(found[0].kind, 'pending_invalid');
});

test('род pending_expired: срок вышел — это находка, а не тихий remove', () => {
  const found = checkWire({
    name: 'x', command: 'node scripts/x.mjs', fileExists: dead,
    pending: { x: { reason: 'awaits-implementation', until: '2026-07-31' } }, today: TODAY,
  });
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, 'pending_expired');
});

test('род pending_orphan: провод жив, а запись держится', () => {
  const found = checkWire({
    name: 'x', command: 'node scripts/x.mjs', fileExists: alive,
    pending: { x: { reason: 'awaits-implementation', until: '2026-09-01' } }, today: TODAY,
  });
  assert.equal(found[0].kind, 'pending_orphan');
});

test('род pending_orphan: запись о команде, которой нет в package.json', () => {
  const { findings } = auditWires({
    scripts: { live: 'node scripts/live.mjs' }, fileExists: alive,
    pending: { 'ушла:совсем': { reason: 'awaits-implementation', until: '2026-09-01' } }, today: TODAY,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'pending_orphan');
  assert.equal(findings[0].name, 'ушла:совсем');
});

test('blocked-by-epic без ссылки — невалидная запись', () => {
  assert.ok(pendingEntryProblems({ reason: 'blocked-by-epic', until: '2026-09-01' }).length > 0);
  assert.deepEqual(
    pendingEntryProblems({ reason: 'blocked-by-epic', until: '2026-09-01', ref: '#1447' }), [],
  );
});

test('срок сравнивается календарно', () => {
  assert.equal(pendingExpired({ until: '2026-07-31' }, TODAY), true);
  assert.equal(pendingExpired({ until: '2026-08-01' }, TODAY), false);
  assert.equal(pendingExpired({ until: '2026-08-02' }, TODAY), false);
});

// ── «сейчас» и вход не выдумываются ──────────────────────────────────────────

test('без today аудит падает, а не считает всё свежим', () => {
  assert.throws(() => auditWires({ scripts: {}, fileExists: alive }), /today/);
});

test('перечни закрыты', () => {
  assert.deepEqual([...VERDICTS], ['implement', 'pending', 'remove']);
  assert.equal(FINDING_KINDS.length, 4);
  assert.equal(PENDING_REASONS.length, 4);
  assert.ok(Object.isFrozen(VERDICTS) && Object.isFrozen(FINDING_KINDS));
});

// ── прогон по живому дереву ──────────────────────────────────────────────────

// Красный ДО разбора доказан прогоном 01.08: 418 команд, 10 мёртвых, код возврата 1.
// После разбора (4 сняты, 6 в pending) тот же зуб обязан быть зелёным — иначе разбор
// ничего не изменил. Утверждение перевёрнуто сознательно, а не подогнано под результат.
test('живой package.json: после разбора связь честная', () => {
  const report = runCheck({ today: TODAY });
  assert.equal(report.findings.length, 0, `находки: ${JSON.stringify(report.findings)}`);
  assert.ok(report.checked > 400, `команд проверено: ${report.checked}`);
});

test('перечень pending покрывает ровно шесть проводов и все с причиной и датой', () => {
  const report = runCheck({ today: TODAY });
  assert.equal(report.findings.length, 0);
  // Сдвинем «сегодня» за срок — все шесть обязаны проявиться как просроченные.
  const after = runCheck({ today: '2026-08-10' });
  assert.equal(after.findings.length, 6, 'за сроком должны проявиться все шесть');
  assert.ok(after.findings.every((f) => f.kind === 'pending_expired'));
});

test('подложенный фальшивый провод роняет зуб, package.json не тронут', () => {
  const before = runCheck({ today: TODAY }).findings.length;
  const after = runCheck({
    today: TODAY,
    extraScripts: { 'fake:wire': 'node scripts/этого-файла-нет.mjs' },
  });
  assert.equal(after.findings.length, before + 1);
  assert.ok(after.findings.some((f) => f.name === 'fake:wire' && f.kind === 'dead_wire'));
});
