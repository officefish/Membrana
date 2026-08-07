import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertPrMergeableOrRegistryLand,
  parsePrLandArgs,
  planPrLand,
  prTouchesRegistry,
  registryMergeLandHint,
  REGISTRY_JSON,
  shipMergeStep,
  PR_SHIP_ENTRY,
  verdictFreshness,
  formatVerdictRefusal,
} from './lib/task-pr-land.mjs';

test('prTouchesRegistry: registry.json и README', () => {
  assert.equal(prTouchesRegistry(['docs/tasks/registry.json']), true);
  assert.equal(prTouchesRegistry(['docs/tasks/README.md']), true);
  assert.equal(prTouchesRegistry(['packages/core/src/index.ts']), false);
});

test('registryMergeLandHint только при touchesRegistry', () => {
  assert.equal(registryMergeLandHint({ touchesRegistry: false }), '');
  assert.match(registryMergeLandHint({ touchesRegistry: true, prNumber: 532 }), /task:pr-land 532/u);
  assert.match(registryMergeLandHint({ touchesRegistry: true }), /union-драйвер/u);
});

test('assertPrMergeableOrRegistryLand: CONFLICTING + registry → hint task:pr-land', () => {
  assert.throws(
    () =>
      assertPrMergeableOrRegistryLand({
        mergeable: 'CONFLICTING',
        mergeStateStatus: 'DIRTY',
        touchesRegistry: true,
        prNumber: 1023,
        branch: 'feat/x',
      }),
    /task:pr-land 1023/u,
  );
});

test('assertPrMergeableOrRegistryLand: MERGEABLE — ok', () => {
  assert.doesNotThrow(() =>
    assertPrMergeableOrRegistryLand({ mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' }),
  );
});

test('planPrLand: merge origin/main без -m, затем pr:ship --merge-only', () => {
  const { steps } = planPrLand({ prNumber: 532, branch: 'feat/x', currentBranch: 'feat/x', execute: true });
  const merge = steps.find((s) => s.label === 'merge-main');
  assert.deepEqual(merge?.args, ['merge', 'origin/main']);
  assert.ok(!merge?.args.includes('-m'));
  const ship = steps.find((s) => s.label === 'ship-merge');
  // Контракт изменён (#1261): шаг зовёт node-вход pr:ship, а не шим yarn — тот падал
  // ENOENT, а `yarn.cmd` падал EINVAL (Node не запускает .cmd без shell).
  assert.deepEqual(ship?.args, [PR_SHIP_ENTRY, '--merge-only', '--execute']);
});

test('planPrLand: --no-wait пробрасывается в pr:ship', () => {
  const { steps } = planPrLand({ prNumber: 1, wait: false, execute: true });
  const ship = steps.find((s) => s.label === 'ship-merge');
  assert.deepEqual(ship?.args, [PR_SHIP_ENTRY, '--merge-only', '--no-wait', '--execute']);
});

test('planPrLand: preflight checkout если не на ветке PR', () => {
  const { preflight } = planPrLand({ prNumber: 1, branch: 'feat/x', currentBranch: 'main' });
  assert.match(String(preflight), /checkout feat\/x/u);
});

test('parsePrLandArgs', () => {
  assert.deepEqual(parsePrLandArgs(['532', '--execute', '--no-wait']), {
    help: false,
    execute: true,
    noWait: true,
    prNumber: '532',
    base: 'main',
  });
});

test(`живой прецедент #1026: путь ${REGISTRY_JSON} в списке файлов`, () => {
  assert.ok(prTouchesRegistry(['docs/tasks/registry.json', 'package.json']));
});

// --- #1261: последний шаг не должен падать на Windows ---------------------------------------

test('ship-merge не зависит от yarn: запуск через node-вход pr:ship', () => {
  // 26.07 шаг не выполнился ДВАЖДЫ: spawnSync yarn ENOENT (PR #1256), затем на «yarn.cmd» —
  // EINVAL (PR #1269): Node с 18.20 не запускает .cmd без shell (CVE-2024-27980).
  const step = shipMergeStep({ execute: true, nodeBin: '/usr/bin/node' });
  assert.equal(step.label, 'ship-merge');
  assert.equal(step.cmd, '/usr/bin/node');
  assert.deepEqual(step.args, [PR_SHIP_ENTRY, '--merge-only', '--execute']);
  assert.ok(!JSON.stringify(step).includes('yarn'), 'yarn не должен участвовать вовсе');
});

test('ship-merge: --no-wait прокидывается, по умолчанию ожидание включено', () => {
  assert.deepEqual(shipMergeStep({ wait: false, nodeBin: 'node' }).args, [PR_SHIP_ENTRY, '--merge-only', '--no-wait']);
  assert.deepEqual(shipMergeStep({ nodeBin: 'node' }).args, [PR_SHIP_ENTRY, '--merge-only']);
});

test('planPrLand: последний шаг — node, а не шим пакетного менеджера', () => {
  const plan = planPrLand({ prNumber: 1269, currentBranch: 'chore/x', execute: true, nodeBin: 'node' });
  const ship = plan.steps.find((s) => s.label === 'ship-merge');
  assert.equal(ship.cmd, 'node');
  assert.equal(ship.args[0], PR_SHIP_ENTRY);
});

// ─── свежесть вердикта после merge (долг #pr-land-invalidates-own-review, #1764) ───
//
// Дефект: шаг merge+push двигал HEAD, а следующий шаг требовал вердикт, привязанный к SHA.
// Инструмент подрывал собственный следующий шаг. Наблюдалось 06.08 и 07.08.

test('вердикт на том же SHA — свеж, идём дальше', () => {
  const r = verdictFreshness({ reviewedSha: 'abc1234def', headSha: 'abc1234def' });
  assert.equal(r.fresh, true);
  assert.equal(r.reason, 'fresh');
});

test('короткая форма SHA сверяется по общей длине, а не строкой целиком', () => {
  assert.equal(verdictFreshness({ reviewedSha: 'abc1234', headSha: 'abc1234def5678' }).fresh, true);
});

test('merge сдвинул HEAD — вердикт протух, это стоп', () => {
  const r = verdictFreshness({ reviewedSha: 'aaaaaaa1', headSha: 'bbbbbbb2' });
  assert.equal(r.fresh, false);
  assert.equal(r.reason, 'stale');
});

test('вердикта нет вовсе — тоже не «свеж»: пустота не есть согласие', () => {
  const r = verdictFreshness({ reviewedSha: null, headSha: 'abc1234' });
  assert.equal(r.fresh, false);
  assert.equal(r.reason, 'no_verdict');
});

test('HEAD не прочитан — fail-closed, а не «наверное совпал»', () => {
  assert.deepEqual(verdictFreshness({ reviewedSha: 'abc1234', headSha: null }), {
    fresh: false,
    reason: 'no_head',
  });
  assert.equal(verdictFreshness({}).reason, 'no_head');
});

test('отказ громкий: оба SHA, диапазон и точные команды resume', () => {
  const lines = formatVerdictRefusal({
    prNumber: 777,
    reviewedSha: 'aaaaaaa1bbbb',
    headSha: 'bbbbbbb2cccc',
    reason: 'stale',
  }).join('\n');
  assert.match(lines, /вердикт протух/);
  assert.match(lines, /aaaaaaa1/);
  assert.match(lines, /bbbbbbb2/);
  assert.match(lines, /git diff aaaaaaa1\.\.bbbbbbb2/);
  assert.match(lines, /yarn code-review:pr 777/);
});

test('отказ прямо говорит, что ревью НЕ запускается само — граница pr-land названа', () => {
  const lines = formatVerdictRefusal({ prNumber: 5, reviewedSha: 'a1b2c3d4', headSha: 'e5f6a7b8', reason: 'stale' }).join('\n');
  assert.match(lines, /pr-land доставляет, вердикт выносит ревьюер/);
});

test('без вердикта отказ не показывает диапазон — сравнивать не с чем', () => {
  const lines = formatVerdictRefusal({ prNumber: 9, reviewedSha: null, headSha: 'e5f6a7b8', reason: 'no_verdict' }).join('\n');
  assert.match(lines, /вердикта ревью по PR #9 нет/);
  assert.ok(!/git diff/.test(lines), 'диапазон без второй стороны — ложная точность');
});

test('гейт свежести стоит МЕЖДУ push и ship — порядок несущий', () => {
  const plan = planPrLand({ prNumber: 1, branch: 'x', currentBranch: 'x', base: 'main', execute: true });
  const labels = plan.steps.map((s) => s.label);
  assert.ok(labels.indexOf('push') < labels.indexOf('verdict-freshness'), 'сверять до push бессмысленно');
  assert.ok(labels.indexOf('verdict-freshness') < labels.indexOf('ship-merge'), 'иначе ship упрётся сам');
});

test('гейт объявлен предикатом, а не командой — исполнитель не пытается его запустить', () => {
  const plan = planPrLand({ prNumber: 1, branch: 'x', currentBranch: 'x', base: 'main' });
  const gate = plan.steps.find((s) => s.label === 'verdict-freshness');
  assert.equal(gate.kind, 'gate');
  assert.equal(gate.cmd, undefined);
});
