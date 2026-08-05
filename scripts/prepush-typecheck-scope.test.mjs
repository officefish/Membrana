import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nonDocsFiles, planPrepushTypecheck, yarnBin } from './prepush-typecheck-scope.mjs';

const PKGS = ['packages/device-board', 'packages/services/telemetry-journal', 'apps/docs'];

test('nonDocsFiles: отсекает .md и .mdx', () => {
  assert.deepEqual(
    nonDocsFiles(['a.md', 'b.mdx', 'c.ts', 'docs.json']),
    ['c.ts', 'docs.json'],
  );
});

test('#1168 docs-only внутри пакета → skip (markdown не поднимает билд пакета)', () => {
  const p = planPrepushTypecheck(
    ['packages/device-board/DEVICE_BOARD_CONCEPT.md', 'apps/docs/nodes/x.mdx'],
    { packageDirs: PKGS },
  );
  assert.equal(p.mode, 'skip');
});

test('#1168 живой кейс: .md в пакете + docs.json в apps/docs → scoped к apps/docs, НЕ к device-board', () => {
  const p = planPrepushTypecheck(
    ['packages/device-board/DEVICE_BOARD_CONCEPT.md', 'apps/docs/docs.json'],
    { packageDirs: PKGS },
  );
  assert.equal(p.mode, 'scoped');
  assert.deepEqual(p.dirs, ['apps/docs']); // device-board НЕ попал (его правка — только .md)
});

test('код в пакете → scoped к нему', () => {
  const p = planPrepushTypecheck(['packages/device-board/src/x.ts'], { packageDirs: PKGS });
  assert.equal(p.mode, 'scoped');
  assert.deepEqual(p.dirs, ['packages/device-board']);
});

test('корневой конфиг → full', () => {
  const p = planPrepushTypecheck(['tsconfig.base.json', 'packages/device-board/src/x.ts'], { packageDirs: PKGS });
  assert.equal(p.mode, 'full');
});

test('только корневые скрипты (не пакет, не docs) → skip (turbo их не типизирует)', () => {
  const p = planPrepushTypecheck(['scripts/pr-ship.mjs', 'scripts/pr-ship.test.mjs'], { packageDirs: PKGS });
  assert.equal(p.mode, 'skip');
});

test('корневой package.json + скрипты → skip, НЕ full (не глобальная зависимость turbo; иначе vite 127 на себе)', () => {
  const p = planPrepushTypecheck(['package.json', 'scripts/pr-ship.mjs', '.githooks/pre-push'], { packageDirs: PKGS });
  assert.equal(p.mode, 'skip');
});

test('пустой список → skip', () => {
  assert.equal(planPrepushTypecheck([], { packageDirs: PKGS }).mode, 'skip');
});

test('yarnBin: Windows hook запускает yarn.cmd, не голый yarn', () => {
  assert.equal(yarnBin('win32'), 'yarn.cmd');
  assert.equal(yarnBin('linux'), 'yarn');
});

// ── Блок prepush-false-red (спринт instruments-honest-verdict, #1725) ──────────
// Предмет: вердикт, опирающийся на недостоверный вход, НЕ выносится — отказывается,
// называя причину. Граница словаря (приговор структурщика 05.08): planPrepushTypecheck
// о резолюции не знает, scopeUnderResolution о docs-триггере не знает.
import { RESOLUTION_STATES } from './lib/worktree-resolution.mjs';
import { planPrepushEffective, scopeUnderResolution } from './prepush-typecheck-scope.mjs';

const FOREIGN = { state: RESOLUTION_STATES.FOREIGN, detail: 'своих 2 из 37' };
const OWN = { state: RESOLUTION_STATES.OWN };

test('#1725 чужая резолюция: межпакетный вердикт не выносится — skip с причиной и судьёй', () => {
  for (const mode of ['scoped', 'full']) {
    const plan = mode === 'scoped' ? { mode, dirs: ['packages/background-cabinet'] } : { mode, reason: 'изменён корневой конфиг' };
    const out = scopeUnderResolution(plan, FOREIGN);
    assert.equal(out.mode, 'skip', `${mode} обязан понизиться при чужой резолюции`);
    assert.equal(out.downgradedFrom, mode, 'из чего понижено — названо, а не скрыто');
    assert.match(out.reason, /недостоверен по построению/u);
    assert.match(out.reason, /CI/u, 'судья назван по имени');
    assert.match(out.reason, /своих 2 из 37/u, 'замер втянут в причину, а не потерян');
  }
});

test('#1725 своя резолюция: план нетронут — гейт продолжает падать за дело', () => {
  const scoped = { mode: 'scoped', dirs: ['packages/core'] };
  assert.deepEqual(scopeUnderResolution(scoped, OWN), scoped);
  assert.deepEqual(scopeUnderResolution({ mode: 'full', reason: 'корневой конфиг' }, OWN), { mode: 'full', reason: 'корневой конфиг' });
});

test('#1725 уже вынесенный skip не переписывается: причина docs-триггера остаётся своей', () => {
  const skip = { mode: 'skip', reason: 'docs-only (.md/.mdx) — типы не затронуты' };
  assert.deepEqual(scopeUnderResolution(skip, FOREIGN), skip);
});

test('#1725 резолюция неизвестна (сторож осёкся) — молчание не повод скипать', () => {
  const scoped = { mode: 'scoped', dirs: ['packages/core'] };
  assert.deepEqual(scopeUnderResolution(scoped, {}), scoped);
  assert.deepEqual(scopeUnderResolution(scoped, { state: undefined }), scoped);
});

test('#1725 композит: два предмета не смешаны', () => {
  const opts = { packageDirs: ['packages/core'] };
  const own = planPrepushEffective(['packages/core/src/index.ts'], { ...opts, resolution: OWN });
  assert.equal(own.mode, 'scoped');
  const foreign = planPrepushEffective(['packages/core/src/index.ts'], { ...opts, resolution: FOREIGN });
  assert.equal(foreign.mode, 'skip');
  assert.equal(foreign.downgradedFrom, 'scoped');
  const docs = planPrepushEffective(['docs/HANDOFF.md'], { ...opts, resolution: FOREIGN });
  assert.match(docs.reason, /docs-only/u, 'docs-причина не подменяется резолюцией');
  assert.equal(docs.downgradedFrom, undefined);
});

test('#1725 живой случай 05.08: две правки Dockerfile при чужой резолюции больше не валят push', () => {
  const plan = planPrepushEffective(
    ['packages/background-cabinet/Dockerfile', 'packages/background-media/Dockerfile'],
    { packageDirs: ['packages/background-cabinet', 'packages/background-media'], resolution: FOREIGN },
  );
  assert.equal(plan.mode, 'skip', 'именно этот случай стоил обхода --no-verify по слову владельца');
  assert.equal(plan.downgradedFrom, 'scoped');
});
