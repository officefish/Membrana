import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  auditProcedures,
  decomposeProcedures,
  FAILING_STATES,
  inspectProcedure,
  loadProcedureRegistry,
} from './lib/procedural-workshop.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'proc-workshop-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const procRoot = join(tmp, 'docs', 'procedures');
mkdirSync(procRoot, { recursive: true });

// Процедура built-valid: dir + README + валидный MANIFEST + резолвящиеся ссылки.
// Движок живёт СНАРУЖИ контейнера (Т12: код в контейнере запрещён).
mkdirSync(join(tmp, 'scripts'), { recursive: true });
function buildProcedure(id, holder, { kitVersion = null } = {}) {
  const dir = join(procRoot, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'README.md'), 'Определение.');
  const enginePath = `scripts/${id}-engine.mjs`;
  writeFileSync(join(tmp, enginePath), '// engine');
  writeFileSync(join(dir, 'MANIFEST.json'), JSON.stringify({
    id, leadPersona: holder, kitVersion, engines: [enginePath], precedents: [],
  }));
}

buildProcedure('ritual-day', 'angelina');
buildProcedure('meeting', 'vesnin');

writeFileSync(join(procRoot, 'registry.json'), JSON.stringify({
  procedures: [
    { id: 'ritual-day', holder: 'angelina', container: { value: true } },
    { id: 'meeting', holder: 'vesnin', container: { value: true } },
    { id: 'storm', holder: 'angelina', container: { value: false } },
    { id: 'ghost', holder: 'vesnin', container: { value: true } }, // drift: заявлен, каталога нет
  ],
}));

test('loadProcedureRegistry читает массив процедур', () => {
  assert.equal(loadProcedureRegistry(tmp).length, 4);
});

test('audit: built-valid для построенных, declared-not-built для storm, drift для ghost', () => {
  const rows = auditProcedures(tmp);
  const by = Object.fromEntries(rows.map((r) => [r.id, r.state]));
  assert.equal(by['ritual-day'], 'built-valid');
  assert.equal(by['meeting'], 'built-valid');
  assert.equal(by['storm'], 'declared-not-built');
  assert.equal(by['ghost'], 'drift-declared-missing');
});

test('audit: у ghost есть проблема (заявлен, каталога нет)', () => {
  const ghost = auditProcedures(tmp).find((r) => r.id === 'ghost');
  assert.ok(ghost.problems.some((p) => p.includes('каталога')));
});

test('decompose by holder', () => {
  const g = decomposeProcedures(auditProcedures(tmp), 'holder');
  assert.deepEqual(g.get('angelina').sort(), ['ritual-day', 'storm']);
  assert.deepEqual(g.get('vesnin').sort(), ['ghost', 'meeting']);
});

test('decompose by status', () => {
  const g = decomposeProcedures(auditProcedures(tmp), 'status');
  assert.deepEqual(g.get('built-valid').sort(), ['meeting', 'ritual-day']);
  assert.deepEqual(g.get('declared-not-built'), ['storm']);
});

test('decompose by kit — построенные с kitVersion:null, storm «не построена»', () => {
  const g = decomposeProcedures(auditProcedures(tmp), 'kit', tmp);
  assert.deepEqual(g.get('null').sort(), ['meeting', 'ritual-day']);
  assert.deepEqual(g.get('не построена').sort(), ['ghost', 'storm']);
});

test('inspectProcedure: построенная — второе измерение из манифеста', () => {
  const r = inspectProcedure(tmp, 'ritual-day');
  assert.equal(r.built, true);
  assert.equal(r.readmePresent, true);
  assert.equal(r.secondDimension.enginesCount, 1);
  assert.equal(r.leadPersona, 'angelina');
});

test('inspectProcedure: объявленная-не-построенная — built:false с пометкой', () => {
  const r = inspectProcedure(tmp, 'storm');
  assert.equal(r.built, false);
  assert.match(r.note, /не построен/);
});

test('built-invalid — реальный дефект, входит в FAILING_STATES (finding MAJOR-1)', () => {
  // Отдельная фикстура: объявлен built, каталог есть, но README пуст → validateProcedure fail.
  const t2 = mkdtempSync(join(tmpdir(), 'proc-invalid-'));
  after(() => rmSync(t2, { recursive: true, force: true }));
  const pr = join(t2, 'docs', 'procedures', 'broke');
  mkdirSync(pr, { recursive: true });
  writeFileSync(join(pr, 'README.md'), ''); // пустой README → invalid
  writeFileSync(join(t2, 'docs', 'procedures', 'registry.json'), JSON.stringify({
    procedures: [{ id: 'broke', holder: 'x', container: { value: true } }],
  }));
  const row = auditProcedures(t2).find((r) => r.id === 'broke');
  assert.equal(row.state, 'built-invalid');
  assert.ok(FAILING_STATES.has('built-invalid'));
});

test('каталог-сирота (dir есть, в реестре нет) — drift-built-undeclared (finding MAJOR-3)', () => {
  const t3 = mkdtempSync(join(tmpdir(), 'proc-orphan-'));
  after(() => rmSync(t3, { recursive: true, force: true }));
  const pr = join(t3, 'docs', 'procedures');
  mkdirSync(join(pr, 'orphan'), { recursive: true });
  writeFileSync(join(pr, 'orphan', 'README.md'), 'x');
  writeFileSync(join(pr, 'registry.json'), JSON.stringify({ procedures: [] }));
  const row = auditProcedures(t3).find((r) => r.id === 'orphan');
  assert.equal(row.state, 'drift-built-undeclared');
  assert.ok(FAILING_STATES.has(row.state));
});

test('битый registry.json — ОШИБКА, не тихий зелёный (finding MAJOR-2)', () => {
  const t4 = mkdtempSync(join(tmpdir(), 'proc-badreg-'));
  after(() => rmSync(t4, { recursive: true, force: true }));
  mkdirSync(join(t4, 'docs', 'procedures'), { recursive: true });
  writeFileSync(join(t4, 'docs', 'procedures', 'registry.json'), '{ битый');
  assert.throws(() => auditProcedures(t4), /битый JSON/);
});

test('запись реестра без id — invalid-entry, не throw (finding MINOR-5)', () => {
  const t5 = mkdtempSync(join(tmpdir(), 'proc-noid-'));
  after(() => rmSync(t5, { recursive: true, force: true }));
  mkdirSync(join(t5, 'docs', 'procedures'), { recursive: true });
  writeFileSync(join(t5, 'docs', 'procedures', 'registry.json'), JSON.stringify({ procedures: [{ holder: 'x' }] }));
  const rows = auditProcedures(t5);
  assert.equal(rows[0].state, 'invalid-entry');
});

test('decompose by kit — реальный kitVersion в свой бакет', () => {
  const t6 = mkdtempSync(join(tmpdir(), 'proc-kit-'));
  after(() => rmSync(t6, { recursive: true, force: true }));
  const pr = join(t6, 'docs', 'procedures');
  mkdirSync(join(t6, 'scripts'), { recursive: true });
  const build = (id, kv) => {
    const dir = join(pr, id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'README.md'), 'x');
    writeFileSync(join(t6, `scripts/${id}-e.mjs`), '//');
    writeFileSync(join(dir, 'MANIFEST.json'), JSON.stringify({ id, leadPersona: 'x', kitVersion: kv, engines: [`scripts/${id}-e.mjs`], precedents: [] }));
  };
  build('with-kit', 'kits/dream-master');
  build('no-kit', null);
  writeFileSync(join(pr, 'registry.json'), JSON.stringify({
    procedures: [
      { id: 'with-kit', holder: 'dynin', container: { value: true } },
      { id: 'no-kit', holder: 'angelina', container: { value: true } },
    ],
  }));
  const g = decomposeProcedures(auditProcedures(t6), 'kit', t6);
  assert.deepEqual(g.get('kits/dream-master'), ['with-kit']);
  assert.deepEqual(g.get('null'), ['no-kit']);
});

// --- Цепочка кадров: inspect отдаёт полосы очереди, а не только паспорт манифеста ---
// Контракт полос (preflight → frames → post) ратифицирован спринтом «фреймы»;
// до его снятия inspect печатал заглушку и цепочку не показывал.

test('inspect: полосы очереди пусты по умолчанию — легальное состояние, не ошибка', () => {
  const r = inspectProcedure(tmp, 'meeting');
  assert.deepEqual(r.queue, { preflight: [], frames: [], post: [] });
  assert.equal(r.secondDimension.frameCount, 0);
});

test('inspect: цепочка кадров читается из всех трёх полос с держателями', () => {
  const dir = join(procRoot, 'queued');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'README.md'), 'Определение.');
  writeFileSync(join(tmp, 'scripts/queued-engine.mjs'), '// engine');
  writeFileSync(join(dir, 'MANIFEST.json'), JSON.stringify({
    id: 'queued',
    leadPersona: 'vesnin',
    kitVersion: null,
    engines: ['scripts/queued-engine.mjs'],
    precedents: [],
    preflight: [{ id: 'gate', holder: 'dynin' }],
    frames: [{ id: 'one', holder: 'vesnin' }, { id: 'two', holder: 'ozhegov' }],
    post: [{ id: 'tail', holder: 'angelina' }],
  }));
  const r = inspectProcedure(tmp, 'queued');
  assert.equal(r.queue.preflight[0].id, 'gate');
  assert.deepEqual(r.queue.frames.map((f) => f.id), ['one', 'two']);
  assert.equal(r.queue.frames[1].holder, 'ozhegov');
  assert.equal(r.queue.post[0].id, 'tail');
  // frameCount считает все три полосы, а не только автоцепочку.
  assert.equal(r.secondDimension.frameCount, 4);
});

test('inspect: битая полоса (не массив) не роняет обзор — читается как пустая', () => {
  const dir = join(procRoot, 'broken-lane');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'README.md'), 'Определение.');
  writeFileSync(join(tmp, 'scripts/broken-lane-engine.mjs'), '// engine');
  writeFileSync(join(dir, 'MANIFEST.json'), JSON.stringify({
    id: 'broken-lane', leadPersona: 'vesnin', kitVersion: null,
    engines: ['scripts/broken-lane-engine.mjs'], precedents: [], frames: 'не массив',
  }));
  const r = inspectProcedure(tmp, 'broken-lane');
  assert.deepEqual(r.queue.frames, []);
  assert.equal(r.secondDimension.frameCount, 0);
});
