/**
 * Тесты семантики отказа шага (узел S вердикта scripts-boundary M0, спринт
 * ritual-step-manifest-sf) + гард манифеста вечерней цепочки.
 *
 * Несущий инвариант: некритичность объявляется ЯВНО. Забыть пометить — получить
 * громкое падение, а не тихий пропуск. Перевёрнутый дефолт и есть весь смысл
 * узла S: `|| true` в шелле давал ровно обратное.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { criticalityOf, stepStatus, isBlocking, explainStatus, validateManifest } from './lib/step-status.mjs';

const MANIFEST = JSON.parse(readFileSync(new URL('../docs/tasks/evening-ritual-steps.json', import.meta.url), 'utf8'));
const STEPS = MANIFEST.steps;

test('criticalityOf: дефолт — critical; noncritical только явным объявлением', () => {
  assert.equal(criticalityOf({ id: 'a' }), 'critical');
  assert.equal(criticalityOf({ id: 'a', criticality: undefined }), 'critical');
  assert.equal(criticalityOf({ id: 'a', criticality: 'мусор' }), 'critical');
  assert.equal(criticalityOf({ id: 'a', criticality: 'noncritical' }), 'noncritical');
});

test('stepStatus: три значения, детерминирован', () => {
  const crit = { id: 'c', criticality: 'critical' };
  const non = { id: 'n', criticality: 'noncritical' };

  assert.equal(stepStatus(crit, { exitCode: 0 }), 'ok');
  assert.equal(stepStatus(non, { exitCode: 0 }), 'ok');
  assert.equal(stepStatus(crit, { exitCode: 1 }), 'failed-critical');
  assert.equal(stepStatus(crit, { exitCode: 127 }), 'failed-critical');
  assert.equal(stepStatus(non, { exitCode: 127 }), 'skipped-noncritical');
  assert.equal(stepStatus(non, { ran: false }), 'skipped-noncritical');
});

test('stepStatus: некритичный сбой НЕ превращается в ok — остаётся отличимым', () => {
  const non = { id: 'n', criticality: 'noncritical' };
  const status = stepStatus(non, { exitCode: 1 });
  assert.notEqual(status, 'ok');
  assert.equal(status, 'skipped-noncritical');
});

test('isBlocking: цепочку останавливает только failed-critical', () => {
  assert.equal(isBlocking('failed-critical'), true);
  assert.equal(isBlocking('skipped-noncritical'), false);
  assert.equal(isBlocking('ok'), false);
});

test('explainStatus: читаемо, с exit-кодом и причиной', () => {
  const non = { id: 'digest', criticality: 'noncritical', label: 'ласточка' };
  assert.match(explainStatus(non, 'skipped-noncritical', { exitCode: 7 }), /exit 7/u);
  assert.match(explainStatus(non, 'skipped-noncritical', { exitCode: 7 }), /некритичным/u);
  assert.match(explainStatus({ id: 'cr' }, 'failed-critical', { exitCode: 127 }), /цепочка встала/u);
});

test('validateManifest: ловит дубли, мусорные оси и необъяснённую некритичность', () => {
  assert.deepEqual(validateManifest([{ id: 'a' }, { id: 'b' }]), []);
  assert.equal(validateManifest([]).length, 1);
  assert.match(validateManifest([{ id: 'a' }, { id: 'a' }])[0], /дубль/u);
  assert.match(validateManifest([{ id: 'a', criticality: 'meh' }])[0], /неизвестная criticality/u);
  assert.match(validateManifest([{ id: 'a', kind: 'meh' }])[0], /неизвестный kind/u);
  assert.match(validateManifest([{ id: 'a', criticality: 'noncritical' }])[0], /без whyNoncritical/u);
});

test('манифест вечера: здоров по гарду', () => {
  assert.deepEqual(validateManifest(STEPS), []);
});

test('манифест вечера: покрывает ВСЕ шаги цепочки ritual:evening (сирот нет)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const chain = pkg.scripts['ritual:evening'];
  const inChain = chain.split('&&').map((s) => {
    const m = /scripts\/([\w-]+\.mjs)/u.exec(s);
    return m?.[1] ?? null;
  }).filter(Boolean);

  const inManifest = STEPS.map((s) => /scripts\/([\w-]+\.mjs)/u.exec(s.script)?.[1]).filter(Boolean);

  for (const script of inChain) {
    assert.ok(inManifest.includes(script), `шаг цепочки ${script} отсутствует в манифесте — сирота`);
  }
  assert.equal(inChain.length, STEPS.length, 'число шагов цепочки и манифеста разошлось');
});

test('манифест вечера: code-review критичен — это инцидент rt-9', () => {
  const cr = STEPS.find((s) => s.id === 'code-review');
  assert.equal(criticalityOf(cr), 'critical', 'code-review обязан быть критичным: 15.07 его падение проглотили');
});

test('манифест вечера: несущее ребро S→F объявлено (archive читает выход code-review)', () => {
  const archive = STEPS.find((s) => s.id === 'archive-code-review');
  assert.equal(archive.consumesFrom['docs/DAILY_CODE_REVIEW.md'], 'code-review');
  assert.equal(criticalityOf(archive), 'critical');
});

test('манифест вечера: каждый noncritical несёт причину, каждый шаг — обе оси', () => {
  for (const s of STEPS) {
    assert.ok(s.kind === 'mechanic' || s.kind === 'gate', `${s.id}: ось kind (#605) не заполнена`);
    assert.ok(s.criticality === 'critical' || s.criticality === 'noncritical', `${s.id}: ось criticality не заполнена`);
    if (s.criticality === 'noncritical') {
      assert.ok(s.whyNoncritical?.length > 20, `${s.id}: некритичность без внятной причины`);
    }
  }
});

test('манифест вечера: consumesFrom ссылается на существующие шаги', () => {
  const ids = new Set(STEPS.map((s) => s.id));
  for (const s of STEPS) {
    for (const producer of Object.values(s.consumesFrom ?? {})) {
      assert.ok(ids.has(producer), `${s.id}: consumesFrom → «${producer}», такого шага нет`);
    }
  }
});
