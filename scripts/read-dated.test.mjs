/**
 * Тесты единственной двери к датированным артефактам (узел F, спринт
 * ritual-step-manifest-sf).
 *
 * Смысл модуля — чтобы гейт не расползся двадцатью копиями по читателям. Здесь
 * проверяется, что дверь ведёт себя одинаково во всех ветках и НИ В ОДНОЙ не
 * молчит: отсутствие файла, протухание, испорченный upstream — всё несёт
 * читаемое «почему».
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { readDated, readDatedOrThrow } from './lib/read-dated.mjs';

const TODAY = '2026-07-18';

function withRoot(files, fn) {
  const root = mkdtempSync(join(tmpdir(), 'read-dated-'));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(root, name), body);
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const fresh = '<!-- Сгенерировано: 2026-07-18T03:00:00.000Z (yarn x@abc1234) -->\n\nтело';
const yesterday = '<!-- Сгенерировано: 2026-07-17T15:00:00.000Z (yarn x) -->\n\nтело';

test('readDated: свежий — ok, содержимое и провенанс на месте', () => {
  withRoot({ 'a.md': fresh }, (root) => {
    const r = readDated('a.md', { today: TODAY, root });
    assert.equal(r.ok, true);
    assert.equal(r.why, null);
    assert.match(r.content, /тело/u);
    assert.equal(r.provenance.revision, 'abc1234');
  });
});

test('readDated: протухший — не ok, и ВСЕГДА с объяснением', () => {
  withRoot({ 'a.md': yesterday }, (root) => {
    const r = readDated('a.md', { today: TODAY, root });
    assert.equal(r.ok, false);
    assert.match(r.why, /устарел на 1 дн/u);
    assert.ok(r.content, 'содержимое возвращается — решение принимает вызывающий, не дверь');
  });
});

test('readDated: кросс-дневное ребро (maxAgeDays=1) пропускает вчерашний', () => {
  withRoot({ 'a.md': yesterday }, (root) => {
    assert.equal(readDated('a.md', { today: TODAY, root, maxAgeDays: 1 }).ok, true);
    assert.equal(readDated('a.md', { today: TODAY, root, maxAgeDays: 0 }).ok, false);
  });
});

test('readDated: нет файла — не ok, без исключения', () => {
  withRoot({}, (root) => {
    const r = readDated('нет.md', { today: TODAY, root });
    assert.equal(r.ok, false);
    assert.match(r.why, /файла нет/u);
  });
});

test('readDated: испорченный upstream перевешивает свежую дату', () => {
  withRoot({ 'a.md': fresh }, (root) => {
    const r = readDated('a.md', { today: TODAY, root, upstreamStatus: 'failed-critical' });
    assert.equal(r.ok, false);
    assert.match(r.why, /шаг-источник не отработал/u);
  });
});

test('readDated: label подставляется в объяснение вместо пути', () => {
  withRoot({ 'a.md': yesterday }, (root) => {
    assert.match(readDated('a.md', { today: TODAY, root, label: 'Ревью дня' }).why, /^Ревью дня/u);
  });
});

test('readDatedOrThrow: строгий вариант бросает с читаемым текстом', () => {
  withRoot({ 'a.md': yesterday }, (root) => {
    assert.throws(() => readDatedOrThrow('a.md', { today: TODAY, root }), /Гейт свежести.*устарел на 1 дн/u);
    assert.match(readDatedOrThrow('a.md', { today: TODAY, root, maxAgeDays: 1 }), /тело/u);
  });
});

test('ИНВАРИАНТ: ни одна ветка не возвращает !ok без «почему»', () => {
  withRoot({ 'stale.md': yesterday, 'ok.md': fresh, 'noprov.md': '# без метки' }, (root) => {
    const cases = [
      ['stale.md', {}],
      ['ok.md', { upstreamStatus: 'skipped-noncritical' }],
      ['noprov.md', {}],
      ['нет.md', {}],
    ];
    for (const [rel, extra] of cases) {
      const r = readDated(rel, { today: TODAY, root, ...extra });
      if (!r.ok) assert.ok(r.why && r.why.length > 10, `${rel}: !ok без объяснения — это и есть молчун`);
    }
  });
});
