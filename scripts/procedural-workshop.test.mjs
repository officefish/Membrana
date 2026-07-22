import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  auditProcedures,
  decomposeProcedures,
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
