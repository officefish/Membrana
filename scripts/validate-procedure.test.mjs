import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  frameLaneProblems,
  listProcedureDirs,
  manifestSchemaProblems,
  normalizeFramePins,
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

test('ритуал снов ritual-dreams: kitVersion → kits/dream-master', () => {
  const dreams = join(repoRoot, 'docs', 'procedures', 'ritual-dreams');
  const r = validateProcedure(dreams, repoRoot);
  assert.equal(r.valid, true, r.problems.join('; '));
  const m = JSON.parse(readFileSync(join(dreams, 'MANIFEST.json'), 'utf8'));
  assert.equal(m.kitVersion, 'kits/dream-master');
  assert.equal(m.engines.length, 1);
  assert.ok(m.precedents.some((p) => p.includes('DREAM_MASTER_PROMPT')));
});

const GOOD_PIN = {
  path: 'docs/example.md',
  anchor: { kind: 'marker', ref: '<!-- gate -->' },
  segmentHash: 'a'.repeat(40),
};

test('F1: отсутствие очереди кадров — валидно (P2/P3 вакуумны)', () => {
  assert.equal(manifestSchemaProblems(GOOD, 'demo').length, 0);
});

test('F1: frames с валидным кадром и pins[] — ок; лишний ключ — дефект', () => {
  const withFrames = {
    ...GOOD,
    frames: [{ id: 'morning-hygiene', holder: 'ozhegov', pins: [GOOD_PIN] }],
  };
  assert.equal(manifestSchemaProblems(withFrames, 'demo').length, 0, manifestSchemaProblems(withFrames, 'demo').join('; '));
  assert.ok(manifestSchemaProblems({ ...GOOD, scenes: [] }, 'demo').some((p) => p.includes('лишнее поле')));
});

test('F1: preflight + frames + post — три полосы; дубль id между полосами — P2 fail', () => {
  const m = {
    ...GOOD,
    preflight: [{ id: 'morning-wiring', holder: 'ozhegov', pins: [GOOD_PIN] }],
    frames: [{ id: 'strategy-day', holder: 'vesnin' }],
    post: [{ id: 'swallow-send', holder: 'angelina' }],
  };
  assert.equal(manifestSchemaProblems(m, 'demo').length, 0, manifestSchemaProblems(m, 'demo').join('; '));
  const dup = {
    ...GOOD,
    preflight: [{ id: 'same', holder: 'ozhegov' }],
    frames: [{ id: 'same', holder: 'vesnin' }],
  };
  assert.ok(manifestSchemaProblems(dup, 'demo').some((p) => p.includes('дубль id')));
});

test('F1: holder вне Persona и битая структура pins — дефекты', () => {
  assert.ok(
    manifestSchemaProblems(
      { ...GOOD, frames: [{ id: 'x', holder: 'manager' }] },
      'demo',
    ).some((p) => p.includes('holder')),
  );
  assert.ok(
    manifestSchemaProblems(
      { ...GOOD, frames: [{ id: 'x', holder: 'vesnin', pins: [{ path: 'a.md' }] }] },
      'demo',
    ).some((p) => p.includes('anchor') || p.includes('segmentHash')),
  );
});

test('F1 ADR-0015: скаляр pin нормализуется в pins[]; pin+pins вместе — дефект', () => {
  const { frame } = normalizeFramePins({ id: 'x', holder: 'vesnin', pin: GOOD_PIN });
  assert.ok(Array.isArray(frame.pins) && frame.pins.length === 1);
  const both = frameLaneProblems(
    [{ id: 'x', holder: 'vesnin', pin: GOOD_PIN, pins: [GOOD_PIN] }],
    'frames',
  );
  assert.ok(both.some((p) => p.includes('одновременно')));
});

test('F1: validateProcedure принимает контейнер с frames', () => {
  const dir = makeContainer('framed', {
    manifest: {
      ...GOOD,
      id: 'framed',
      frames: [{ id: 'step-one', holder: 'angelina', pins: [GOOD_PIN] }],
    },
  });
  const r = validateProcedure(dir, tmp);
  assert.equal(r.valid, true, r.problems.join('; '));
});
