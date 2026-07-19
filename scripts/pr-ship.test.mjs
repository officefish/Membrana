import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractIssueMentions,
  isBaseHeldElsewhere,
  otherWorktreeBranches,
  planBranchStep,
  planPrShip,
} from './pr-ship.mjs';

test('planPrShip: title + trailer + Closes + порядок шагов', () => {
  const { title, commitBody, steps } = planPrShip({
    type: 'feat',
    scope: 'core',
    message: 'добавить X',
    issue: 123,
    branch: 'feat/x',
  });
  assert.equal(title, 'feat(core): добавить X');
  assert.match(commitBody, /Closes #123/);
  assert.match(commitBody, /Co-Authored-By: Claude Opus 4\.8/);
  assert.deepEqual(
    steps.map((s) => s.label),
    ['branch', 'commit', 'push', 'pr-create', 'ci-wait', 'merge', 'branch-cleanup', 'sync-checkout', 'sync-fetch', 'sync-ff'],
  );
  assert.deepEqual(steps[0].args, ['checkout', '-b', 'feat/x']);
});

// ─── #653: merge-шаг из worktree ───────────────────────────────────────────────

test('#653 п.1: merge БЕЗ --delete-branch, remote-ветка отдельным branch-cleanup', () => {
  const { steps } = planPrShip({ type: 'feat', message: 'x', branch: 'feat/x' });
  const merge = steps.find((s) => s.label === 'merge');
  assert.deepEqual(merge.args, ['pr', 'merge', '--squash']);
  const cleanup = steps.find((s) => s.label === 'branch-cleanup');
  assert.deepEqual(cleanup.args, ['push', 'origin', '--delete', 'feat/x']);
});

test('#653 п.2: ci-wait стоит ДО merge; --no-wait его снимает', () => {
  const { steps } = planPrShip({ type: 'feat', message: 'x', branch: 'feat/x' });
  const labels = steps.map((s) => s.label);
  assert.ok(labels.indexOf('ci-wait') < labels.indexOf('merge'));
  const noWait = planPrShip({ type: 'feat', message: 'x', branch: 'feat/x', wait: false });
  assert.ok(!noWait.steps.map((s) => s.label).includes('ci-wait'));
});

test('#653: --no-commit берёт имя ветки из currentBranch для cleanup', () => {
  const { steps } = planPrShip({ type: 'fix', message: 'x', commit: false, currentBranch: 'fix/y' });
  const cleanup = steps.find((s) => s.label === 'branch-cleanup');
  assert.deepEqual(cleanup.args, ['push', 'origin', '--delete', 'fix/y']);
});

test('#653: без имени ветки (или ветка = base) cleanup не планируется', () => {
  const none = planPrShip({ type: 'fix', message: 'x', commit: false });
  assert.ok(!none.steps.some((s) => s.label === 'branch-cleanup'));
  const onBase = planPrShip({ type: 'fix', message: 'x', commit: false, currentBranch: 'main' });
  assert.ok(!onBase.steps.some((s) => s.label === 'branch-cleanup'));
});

test('planPrShip: без scope и issue', () => {
  const { title, commitBody } = planPrShip({ type: 'fix', message: 'y' });
  assert.equal(title, 'fix: y');
  assert.doesNotMatch(commitBody, /Closes/);
});

test('planPrShip: --no-merge не добавляет merge/sync', () => {
  const { steps } = planPrShip({ type: 'chore', message: 'z', merge: false });
  assert.deepEqual(
    steps.map((s) => s.label),
    ['commit', 'push', 'pr-create'],
  );
});

test('planPrShip: требует type и message', () => {
  assert.throws(() => planPrShip({ message: 'no type' }), /type.*message/);
  assert.throws(() => planPrShip({ type: 'feat' }), /type.*message/);
});

test('planPrShip: ff-sync через origin/base, не голый pull', () => {
  const { steps } = planPrShip({ type: 'feat', message: 'x', base: 'main' });
  const ff = steps.find((s) => s.label === 'sync-ff');
  assert.deepEqual(ff.args, ['merge', '--ff-only', 'origin/main']);
});

test('planPrShip --no-commit: шаг commit пропущен, флоу начинается с push', () => {
  const { steps } = planPrShip({ type: 'fix', message: 'готовые коммиты', commit: false });
  const labels = steps.map((s) => s.label);
  assert.ok(!labels.includes('commit'), 'commit-шага быть не должно');
  assert.equal(labels[0], 'push');
  assert.ok(labels.includes('pr-create'));
  assert.ok(labels.includes('merge'));
});

test('planPrShip --no-commit + --branch → ошибка (несовместимы)', () => {
  assert.throws(
    () => planPrShip({ type: 'fix', message: 'x', commit: false, branch: 'feat/x' }),
    /--no-commit несовместим с --branch/,
  );
});

test('planBranchStep: уже на ветке → шаг не нужен (живой случай 19.07)', () => {
  assert.equal(planBranchStep('feat/x', { currentBranch: 'feat/x' }), null);
  const { steps } = planPrShip({
    type: 'feat',
    message: 'x',
    branch: 'feat/x',
    currentBranch: 'feat/x',
  });
  assert.ok(!steps.some((s) => s.label === 'branch'));
});

test('planBranchStep: локальная ветка есть → checkout без -b', () => {
  assert.deepEqual(planBranchStep('feat/x', { currentBranch: 'main', localBranches: ['feat/x'] }), {
    label: 'branch',
    cmd: 'git',
    args: ['checkout', 'feat/x'],
  });
});

test('planBranchStep: новой ветки нет → checkout -b', () => {
  assert.deepEqual(planBranchStep('feat/new', { currentBranch: 'main', localBranches: ['main'] }), {
    label: 'branch',
    cmd: 'git',
    args: ['checkout', '-b', 'feat/new'],
  });
});

// ─── worktree: ff-sync невозможен, если base держит соседнее дерево (#476 п.2) ─────

test('base занят другим worktree → sync-checkout не планируется', () => {
  // Живое: pr:ship падал в worktree на `git checkout main` — main держит соседняя
  // сессия. Одна ветка не может быть в двух worktree, это норма, а не ошибка.
  const { steps, skippedSync } = planPrShip({
    type: 'feat',
    message: 'x',
    worktreeBranches: ['main', 'chore/palette-clarity-setup'],
  });
  const labels = steps.map((s) => s.label);
  assert.ok(!labels.includes('sync-checkout'), 'checkout в занятую ветку не планируем');
  assert.ok(!labels.includes('sync-ff'), 'ff-merge в чужое дерево бессмыслен');
  assert.ok(labels.includes('sync-fetch'), 'origin/main обновить всё равно нужно');
  assert.match(skippedSync, /другой worktree/);
});

test('base свободен → полный ff-sync как раньше', () => {
  const { steps, skippedSync } = planPrShip({
    type: 'feat',
    message: 'x',
    worktreeBranches: ['feat/other'],
  });
  assert.deepEqual(
    steps.map((s) => s.label),
    ['commit', 'push', 'pr-create', 'ci-wait', 'merge', 'sync-checkout', 'sync-fetch', 'sync-ff'],
  );
  assert.equal(skippedSync, undefined);
});

test('без сведений о worktree поведение прежнее (обратная совместимость)', () => {
  const { steps } = planPrShip({ type: 'feat', message: 'x' });
  assert.ok(steps.map((s) => s.label).includes('sync-checkout'));
});

test('isBaseHeldElsewhere — предикат по списку чужих веток', () => {
  assert.equal(isBaseHeldElsewhere('main', ['main']), true);
  assert.equal(isBaseHeldElsewhere('main', ['feat/x']), false);
  assert.equal(isBaseHeldElsewhere('main', []), false);
});

// ─── гейт closing keyword: «(#N)» ≠ Closes #N ─────────────────────────────────────

test('extractIssueMentions находит упоминания, включая живой заголовок PR #417', () => {
  assert.deepEqual(extractIssueMentions('feat(client): yamnet (#415, консилиум 2026-07-13)'), [415]);
  assert.deepEqual(extractIssueMentions('fix: правка #1 и #22'), [1, 22]);
  assert.deepEqual(extractIssueMentions('chore: без упоминаний'), []);
});

test('упоминание #N без --issue → отказ (живой случай PR #417 → #415 висел open)', () => {
  // Тело PR #417 = копия заголовка со «(#415)»; issue остался open при слитом коде,
  // и ритуал 16.07 назначил переписать существующее ядро.
  assert.throws(
    () => planPrShip({ type: 'feat', scope: 'client', message: 'yamnet в живом combined (#415)' }),
    /#415.*--issue не задан|НЕ закрывает issue/su,
  );
});

test('--issue закрывает issue: Closes попадает в тело, отказа нет', () => {
  const { commitBody } = planPrShip({
    type: 'feat',
    scope: 'client',
    message: 'yamnet в живом combined (#415)',
    issue: 415,
  });
  assert.match(commitBody, /Closes #415/u);
});

test('--allow-mention разрешает намеренную ссылку без закрытия', () => {
  const { commitBody } = planPrShip({
    type: 'docs',
    message: 'разбор инцидента (#415)',
    allowMentionWithoutClose: true,
  });
  assert.ok(!/Closes/u.test(commitBody), 'намеренная ссылка не закрывает issue');
});

test('заголовок без #N — поведение прежнее (обратная совместимость)', () => {
  const { title } = planPrShip({ type: 'feat', message: 'x' });
  assert.equal(title, 'feat: x');
});

// ─── otherWorktreeBranches: парсер porcelain ──────────────────────────────────────
// От него зависит и pr:ship, и утренний ритуал (#515 п.2): если он молча вернёт
// пусто, оба снова пойдут в заведомо падающий `git checkout main`.

/** Фейковый git: porcelain + toplevel текущего дерева. */
const fakeGit = (porcelain, toplevel) => (_cmd, args) =>
  args[0] === 'rev-parse' ? `${toplevel}\n` : porcelain;

const PORCELAIN = [
  'worktree C:/Users/dev/practice/Membrana',
  'HEAD 95f1f03b65b9be7f2fa71f08d43eda9f431a590c',
  'branch refs/heads/docs/dns-domain-policy',
  '',
  'worktree C:/Users/dev/practice/Membrana-detector-compare',
  'HEAD cc7e70c329db644ea81680a09ba6704ee15b8d4a',
  'branch refs/heads/main',
  '',
  'worktree C:/Users/dev/practice/Membrana-openrouter',
  'HEAD 845bcde02708c5059c2eb09fcb9e0fd980f6c549',
  'branch refs/heads/chore/tooling-xs-pair',
  '',
].join('\n');

test('otherWorktreeBranches: своё дерево исключено, чужие ветки видны', () => {
  const branches = otherWorktreeBranches(
    fakeGit(PORCELAIN, 'C:/Users/dev/practice/Membrana-openrouter'),
  );
  assert.deepEqual(branches, ['docs/dns-domain-policy', 'main']);
  assert.equal(isBaseHeldElsewhere('main', branches), true);
});

test('otherWorktreeBranches: свой main не считается занятым (иначе checkout пропускался бы зря)', () => {
  const branches = otherWorktreeBranches(
    fakeGit(PORCELAIN, 'C:/Users/dev/practice/Membrana-detector-compare'),
  );
  assert.ok(!branches.includes('main'), 'main держит ТЕКУЩЕЕ дерево — не чужое');
  assert.equal(isBaseHeldElsewhere('main', branches), false);
});

test('otherWorktreeBranches: Windows — обратные слэши и регистр диска не ломают сравнение', () => {
  // git печатает C:/..., а rev-parse под Git Bash может отдать иной регистр/слэши.
  const branches = otherWorktreeBranches(
    fakeGit(PORCELAIN, 'c:\\Users\\dev\\practice\\Membrana-openrouter'),
  );
  assert.ok(!branches.includes('chore/tooling-xs-pair'), 'своё дерево должно быть исключено');
});

test('otherWorktreeBranches: git недоступен → пусто, а не падение', () => {
  const branches = otherWorktreeBranches(() => {
    throw new Error('git not found');
  });
  assert.deepEqual(branches, []);
});
