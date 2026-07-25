/**
 * Тесты ядра kits-pins (приведение описи кита к факту) + регресс на живые киты.
 *
 * Регресс: 25.07 полный `kits:audit` дал 30 блокирующих находок — описи трёх китов
 * молча разошлись с деревом, потому что сверка не стояла ни на одном пути. Последний
 * тест держит эту границу: любой кит в `kits/` обязан сходиться с подграфом своих корней.
 */
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { auditKit, listKitDirs } from './lib/kit-subgraph-audit.mjs';
import { blockersBeforeWrite, diffPins, nextManifest, normalizePins, renderPinsPlan } from './lib/kits-pins.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (n) => String(n).repeat(40).slice(0, 40);

test('diffPins: три рода правки и чистый случай', () => {
  const current = { 'scripts/a.mjs': sha(1), 'scripts/b.mjs': sha(2), 'scripts/orphan.mjs': sha(3) };
  const actual = { 'scripts/a.mjs': sha(1), 'scripts/b.mjs': sha(9), 'scripts/new.mjs': sha(4) };
  const d = diffPins(current, actual);
  assert.deepEqual(d.added, ['scripts/new.mjs']);
  assert.deepEqual(d.removed, ['scripts/orphan.mjs']);
  assert.deepEqual(d.changed.map((c) => c.path), ['scripts/b.mjs']);
  assert.equal(d.clean, false);

  const same = diffPins(current, current);
  assert.equal(same.clean, true);
  assert.ok(renderPinsPlan('kit', same).includes('совпадает с деревом'));
});

test('nextManifest: меняется только pins, порядок полей и остальное сохранены', () => {
  const manifest = { id: 'k', leadPersona: 'angelina', roots: ['scripts/a.mjs'], pins: { 'scripts/a.mjs': sha(1) } };
  const next = nextManifest(manifest, { 'scripts/b.mjs': sha(2), 'scripts/a.mjs': sha(1) });
  assert.deepEqual(Object.keys(next), ['id', 'leadPersona', 'roots', 'pins'], 'порядок полей манифеста тот же');
  assert.equal(next.id, 'k');
  assert.deepEqual(next.roots, ['scripts/a.mjs'], 'roots не трогаются');
  assert.deepEqual(Object.keys(next.pins), ['scripts/a.mjs', 'scripts/b.mjs'], 'опись отсортирована');
  assert.deepEqual(manifest.pins, { 'scripts/a.mjs': sha(1) }, 'исходный манифест не мутирован');
});

test('normalizePins сортирует и не теряет записей', () => {
  const n = normalizePins({ b: sha(2), a: sha(1), c: sha(3) });
  assert.deepEqual(Object.keys(n), ['a', 'b', 'c']);
  assert.equal(Object.keys(n).length, 3);
});

test('blockersBeforeWrite: дефект схемы и недостижимый узел запрещают запись', () => {
  assert.deepEqual(blockersBeforeWrite({ findings: [] }), []);
  assert.deepEqual(blockersBeforeWrite({ findings: [{ kind: 'sha_drift', detail: 'уехал' }] }), [], 'дрейф — это как раз то, что чиним');

  const blocked = blockersBeforeWrite({
    findings: [
      { kind: 'schema', detail: 'лишнее поле foo' },
      { kind: 'unresolvable', detail: 'узел отсутствует на диске: scripts/x.mjs' },
    ],
  });
  assert.equal(blocked.length, 2, 'запись отменяется — зелёная опись не должна прикрыть дыру');
});

test('живые киты: опись каждого жильца сходится с подграфом его корней', () => {
  const kitsRoot = join(ROOT, 'kits');
  const dirs = listKitDirs(kitsRoot).filter((d) => existsSync(join(d, 'MANIFEST.json')));
  assert.ok(dirs.length > 0, 'в kits/ есть жильцы');

  const drifted = [];
  for (const kitDir of dirs) {
    const manifest = JSON.parse(readFileSync(join(kitDir, 'MANIFEST.json'), 'utf8'));
    const report = auditKit({ repoRoot: ROOT, kitDir, mode: 'pinned' });
    const d = diffPins(manifest.pins ?? {}, report.actual ?? {});
    if (!d.clean) drifted.push(renderPinsPlan(basename(kitDir), d));
  }
  assert.deepEqual(drifted, [], `описи разошлись с деревом:\n${drifted.join('\n')}\nПривести: yarn kits:pins --id <кит> --write`);
});
