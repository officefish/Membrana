import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  listProcedureDirs,
  manifestSchemaProblems,
  validateProcedure,
} from './lib/validate-procedure.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Фикстура: временный «репозиторий» с контейнером.
const tmp = mkdtempSync(join(tmpdir(), 'proc-validate-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

function makeContainer(id, { readme = 'Определение.', manifest, extraFile } = {}) {
  const dir = join(tmp, 'docs', 'procedures', id);
  mkdirSync(dir, { recursive: true });
  if (readme !== null) writeFileSync(join(dir, 'README.md'), readme);
  if (manifest !== null) {
    writeFileSync(join(dir, 'MANIFEST.json'),
      typeof manifest === 'string' ? manifest : JSON.stringify(manifest));
  }
  if (extraFile) writeFileSync(join(dir, extraFile), '// code');
  return dir;
}

const GOOD = {
  id: 'demo',
  leadPersona: 'angelina',
  kitVersion: null,
  engines: ['scripts/demo-engine.mjs'],
  precedents: [],
};

mkdirSync(join(tmp, 'scripts'), { recursive: true });
writeFileSync(join(tmp, 'scripts', 'demo-engine.mjs'), 'export {};');

test('валидный контейнер: все три предиката истинны, valid=true', () => {
  const dir = makeContainer('demo', { manifest: GOOD });
  const r = validateProcedure(dir, tmp);
  assert.deepEqual(
    { valid: r.valid, resolvable: r.resolvable, readmeNonEmpty: r.readmeNonEmpty, manifestSchemaOk: r.manifestSchemaOk },
    { valid: true, resolvable: true, readmeNonEmpty: true, manifestSchemaOk: true },
    r.problems.join('; '),
  );
});

test('нерезолвящийся движок → resolvable=false, дефект с путём', () => {
  const dir = makeContainer('ghost', { manifest: { ...GOOD, id: 'ghost', engines: ['scripts/net-takogo.mjs'] } });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.includes('net-takogo.mjs')));
});

test('пустой README и битый JSON — оба дефекта названы', () => {
  const dir = makeContainer('broken', { readme: '   ', manifest: '{оборвано' });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.includes('README')));
  assert.ok(r.problems.some((p) => p.includes('битый JSON')));
});

test('код в контейнере (Т12) — дефект даже при валидной схеме', () => {
  const dir = makeContainer('coded', { manifest: { ...GOOD, id: 'coded' }, extraFile: 'helper.mjs' });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.includes('Т12')));
});

test('схема: пустые engines, лишнее поле, id≠каталогу — дефекты', () => {
  assert.ok(manifestSchemaProblems({ ...GOOD, engines: [] }, 'demo').some((p) => p.includes('без движков')));
  assert.ok(manifestSchemaProblems({ ...GOOD, extra: 1 }, 'demo').some((p) => p.includes('лишнее поле')));
  assert.ok(manifestSchemaProblems(GOOD, 'other').some((p) => p.includes('≠ имени каталога')));
});

test('ЗУБ CI: каждый реальный контейнер docs/procedures/ валиден', () => {
  const dirs = listProcedureDirs(repoRoot);
  assert.ok(dirs.length >= 1, 'дом слоя не пуст — первый жилец заселён (Р1)');
  for (const dir of dirs) {
    const r = validateProcedure(dir, repoRoot);
    assert.equal(r.valid, true, `${dir}: ${r.problems.join('; ')}`);
  }
});

test('kitVersion на несуществующий кит → resolvable=false', () => {
  const dir = makeContainer('badkit', {
    manifest: { ...GOOD, id: 'badkit', kitVersion: 'kits/net-takogo' },
  });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((p) => p.includes('kitVersion не резолвится')));
});

test('ритуал утра ritual-day: kitVersion → kits/angelina-morning', () => {
  const day = join(repoRoot, 'docs', 'procedures', 'ritual-day');
  const r = validateProcedure(day, repoRoot);
  assert.equal(r.valid, true, r.problems.join('; '));
  const m = JSON.parse(readFileSync(join(day, 'MANIFEST.json'), 'utf8'));
  assert.equal(m.kitVersion, 'kits/angelina-morning');
  assert.equal(m.engines.length, 1, 'engines не дублируют весь кит');
});
