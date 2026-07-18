/**
 * Тесты семантики отказа шага (узел S вердикта scripts-boundary M0, спринт
 * ritual-step-manifest-sf) + гард манифеста вечерней цепочки.
 *
 * Несущий инвариант: некритичность объявляется ЯВНО. Забыть пометить — получить
 * громкое падение, а не тихий пропуск. Перевёрнутый дефолт и есть весь смысл
 * узла S: `|| true` в шелле давал ровно обратное.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { blockedInputs, criticalityOf, stepStatus, isBlocking, explainStatus, validateManifest } from './lib/step-status.mjs';

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

const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

/** Имена скриптов, упомянутых в шелл-строке. */
function scriptsIn(chain) {
  return [...String(chain ?? '').matchAll(/scripts\/([\w-]+\.mjs)/gu)].map((m) => m[1]);
}

test('ГАРД: ritual:evening ведётся МАНИФЕСТОМ, а не сырой &&-цепочкой', () => {
  const chain = PKG.scripts['ritual:evening'];
  assert.match(chain, /ritual-evening-run\.mjs/u, 'вечер обязан идти через раннер по манифесту');
  assert.ok(!chain.includes('&&'), 'сырая &&-цепочка вернулась — критичность снова выражается порядком строк');
});

test('ГАРД DoD M0: ни один КРИТИЧНЫЙ шаг не обёрнут в || true', () => {
  // Регрессия, ради которой гард написан: `|| true` на критичном шаге и есть
  // проглоченный сбой (15.07 — code-review отдал 127, никто не заметил).
  const critical = new Set(STEPS.filter((s) => criticalityOf(s) === 'critical').map((s) => scriptsIn(s.script)[0]));

  for (const [name, body] of Object.entries(PKG.scripts)) {
    if (!name.startsWith('ritual:evening')) continue;
    for (const segment of String(body).split('&&')) {
      if (!segment.includes('|| true')) continue;
      for (const script of scriptsIn(segment)) {
        assert.ok(!critical.has(script), `${name}: критичный шаг ${script} обёрнут в || true — сбой будет проглочен`);
      }
    }
  }
});

test('манифест вечера: пока жив legacy-откат, он не расходится с манифестом', () => {
  const legacy = PKG.scripts['ritual:evening:legacy'];
  if (!legacy) return; // откат снят после живой проверки — гарду нечего сверять

  const inLegacy = scriptsIn(legacy);
  const inManifest = STEPS.flatMap((s) => scriptsIn(s.script));
  for (const script of inLegacy) {
    assert.ok(inManifest.includes(script), `шаг legacy-цепочки ${script} отсутствует в манифесте — сирота`);
  }
  assert.equal(inLegacy.length, STEPS.length, 'число шагов legacy-цепочки и манифеста разошлось');
});

test('манифест вечера: каждый объявленный script существует на диске', () => {
  for (const s of STEPS) {
    const file = scriptsIn(s.script)[0];
    assert.ok(file, `${s.id}: из script не вычленяется файл`);
    assert.ok(existsSync(new URL(`../scripts/${file}`, import.meta.url)), `${s.id}: ${file} не существует`);
  }
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

test('blockedInputs: блокирует только consumesFrom, и только при не-ok производителе', () => {
  const step = { id: 'x', consumesFrom: { 'a.md': 'p1', 'b.md': 'p2' } };
  assert.deepEqual(blockedInputs(step, { p1: 'ok', p2: 'ok' }), []);
  assert.deepEqual(blockedInputs(step, {}), [], 'производитель ещё не отработал — не блокируем');
  assert.equal(blockedInputs(step, { p1: 'failed-critical', p2: 'ok' }).length, 1);
  assert.equal(blockedInputs(step, { p1: 'failed-critical', p2: 'skipped-noncritical' }).length, 2);
  assert.deepEqual(blockedInputs({ id: 'y' }, { p1: 'failed-critical' }), [], 'без consumesFrom — не заложник');
});

/** Прогон манифеста с заданными исходами: повторяет решения ritual-evening-run.mjs. */
function simulate(steps, outcomeById) {
  const statuses = {};
  for (const step of steps) {
    const blocked = blockedInputs(step, statuses);
    statuses[step.id] = blocked.length > 0
      ? stepStatus(step, { ran: false })
      : stepStatus(step, outcomeById[step.id] ?? { exitCode: 0 });
  }
  return statuses;
}

test('ИНВАРИАНТ КАНОНА: падение code-review блокирует архив, но НЕ feedback и НЕ дайджест', () => {
  const st = simulate(STEPS, { 'code-review': { exitCode: 127 } });

  assert.equal(st['code-review'], 'failed-critical', 'ревью упало громко');
  assert.equal(st['archive-code-review'], 'failed-critical', 'зависимый архив заблокирован — вчерашний отчёт не ляжет под сегодняшней меткой');

  // .claude/CLAUDE.md: «Run even if code-review step failed — feedback is independent.»
  assert.equal(st['evening-tail'], 'ok', 'team-evening-feedback обязан отработать при упавшем ревью');
  assert.equal(st['telegram-digest'], 'ok', 'партнёрский дайджест не заложник ревью');
});

test('ИНВАРИАНТ: падение evening-tail блокирует дайджест — ему нечего слать', () => {
  const st = simulate(STEPS, { 'evening-tail': { exitCode: 1 } });
  assert.equal(st['evening-tail'], 'failed-critical');
  assert.equal(st['telegram-digest'], 'skipped-noncritical', 'дайджест некритичен, но артефакта нет — слать нечего');
});

test('ИНВАРИАНТ: некритичный сбой не роняет никого', () => {
  const st = simulate(STEPS, { 'insight-drift': { exitCode: 1 }, 'rag-index': { exitCode: 1 } });
  assert.equal(st['insight-drift'], 'skipped-noncritical');
  assert.equal(st['rag-index'], 'skipped-noncritical');
  for (const id of ['code-review', 'archive-code-review', 'evening-tail', 'telegram-digest']) {
    assert.equal(st[id], 'ok', `${id} не должен страдать от некритичного сбоя`);
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
