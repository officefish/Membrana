import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  listWorkshopManifests,
  validateWorkshop,
  workshopHome,
  workshopSchemaProblems,
} from './lib/validate-workshop.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'workshop-validate-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

/** Валидный манифест-эталон (audit+decompose есть, inspectElement присутствует). */
function fullManifest(overrides = {}) {
  return {
    pattern: 'docs/patterns/HOME_WORKSHOP.md',
    name: 'test-workshop',
    worksOn: 'docs/audit/thing',
    kit: null,
    verbs: {
      audit: 'yarn thing:audit',
      decompose: 'yarn thing:decompose',
      inspectElement: 'yarn thing:inspect',
      stackLike: [],
      domain: [],
    },
    ...overrides,
  };
}

function writeManifest(dir, obj) {
  const home = join(tmp, dir);
  mkdirSync(home, { recursive: true });
  const p = join(home, 'workshop.manifest.json');
  writeFileSync(p, typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
  return p;
}

test('полный валидный манифест — valid, без предупреждений', () => {
  const p = writeManifest('docs/audit/full', fullManifest());
  const r = validateWorkshop(p);
  assert.equal(r.valid, true, r.problems.join('; '));
  assert.equal(r.warnings.length, 0);
});

test('inspectElement: null — valid, но с предупреждением SHOULD (шов Ф2↔Ф5)', () => {
  const m = fullManifest();
  m.verbs.inspectElement = null;
  const p = writeManifest('docs/audit/no-inspect', m);
  const r = validateWorkshop(p);
  assert.equal(r.valid, true, r.problems.join('; '));
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /inspectElement/);
});

test('inspectElement: ключ ОПУЩЕН целиком — тоже valid + предупреждение, не провал (finding 1)', () => {
  const m = fullManifest();
  delete m.verbs.inspectElement;
  const p = writeManifest('docs/audit/omit-inspect', m);
  const r = validateWorkshop(p);
  assert.equal(r.valid, true, r.problems.join('; '));
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /inspectElement/);
});

test('лишний ключ в доменной записи — не valid (finding 5)', () => {
  const m = fullManifest();
  m.verbs.domain = [{ name: 'salvage', worksOn: 'docs/audit/full', bogus: 1 }];
  const p = writeManifest('docs/audit/domain-extra', m);
  const r = validateWorkshop(p);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((x) => x.includes('лишний ключ bogus')));
});

test('нет audit (ключ отсутствует) — не valid', () => {
  const m = fullManifest();
  delete m.verbs.audit;
  const p = writeManifest('docs/audit/no-audit', m);
  const r = validateWorkshop(p);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((x) => x.includes('audit')));
});

test('пустой decompose — не valid', () => {
  const m = fullManifest();
  m.verbs.decompose = '';
  const p = writeManifest('docs/audit/empty-decompose', m);
  const r = validateWorkshop(p);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((x) => x.includes('decompose')));
});

test('audit+decompose = null — valid с ⚠ (g0 V2: инвентарь вне мастерской)', () => {
  const m = fullManifest();
  m.verbs.audit = null;
  m.verbs.decompose = null;
  const p = writeManifest('docs/tasks/decision', m);
  const r = validateWorkshop(p);
  assert.equal(r.valid, true, r.problems.join('; '));
  assert.ok(r.warnings.some((x) => x.includes('audit') && x.includes('null')));
  assert.ok(r.warnings.some((x) => x.includes('decompose') && x.includes('null')));
});

test('worksOn массив — не valid (кратность 1)', () => {
  const m = fullManifest({ worksOn: ['a', 'b'] });
  const p = writeManifest('docs/audit/multi-house', m);
  const r = validateWorkshop(p);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((x) => x.includes('ОДНИМ домом')));
});

test('лишнее поле — не valid («манифест — контракт, не свалка»)', () => {
  const m = fullManifest({ extra: 1 });
  const p = writeManifest('docs/audit/extra', m);
  const r = validateWorkshop(p);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((x) => x.includes('лишнее поле extra')));
});

test('доменный инструмент без worksOn — не valid', () => {
  const m = fullManifest();
  m.verbs.domain = [{ name: 'salvage' }];
  const p = writeManifest('docs/audit/domain-no-workson', m);
  const r = validateWorkshop(p);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((x) => x.includes('worksOn')));
});

test('kit строкой без дома кита — resolvable=false при заданном repoRoot', () => {
  const m = fullManifest({ kit: 'kits/nonexistent' });
  const p = writeManifest('docs/audit/bad-kit', m);
  const r = validateWorkshop(p, tmp);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((x) => x.includes('kit не резолвится')));
});

test('битый JSON — не valid', () => {
  const p = writeManifest('docs/audit/broken', '{ not json');
  const r = validateWorkshop(p);
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((x) => x.includes('битый JSON')));
});

test('отсутствующий манифест — не valid', () => {
  const r = validateWorkshop(join(tmp, 'docs/audit/ghost/workshop.manifest.json'));
  assert.equal(r.valid, false);
  assert.ok(r.problems.some((x) => x.includes('отсутствует')));
});

test('workshopSchemaProblems: не объект', () => {
  const { problems } = workshopSchemaProblems([1, 2]);
  assert.ok(problems.some((x) => x.includes('не объект')));
});

test('listWorkshopManifests находит манифесты, cache пропускает', () => {
  writeManifest('docs/audit/found-a', fullManifest());
  const cacheDir = join(tmp, 'docs/audit/found-a/cache');
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, 'workshop.manifest.json'), '{}');
  const list = listWorkshopManifests(tmp);
  assert.ok(list.some((p) => p.includes('found-a')));
  assert.ok(!list.some((p) => p.includes(join('found-a', 'cache'))));
});

test('workshopHome — имя дома по пути манифеста', () => {
  assert.equal(workshopHome(join(tmp, 'docs/audit/git/workshop.manifest.json')), 'git');
});
