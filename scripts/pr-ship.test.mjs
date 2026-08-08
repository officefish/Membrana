import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertPrMergeableForShip,
  autoMergeDecision,
  headSyncProblem,
  ciWaitDisposition,
  extractIssueMentions,
  isBaseHeldElsewhere,
  otherWorktreeBranches,
  planBranchStep,
  planMergeTail,
  reviewGateArgs,
  planPrShip,
  unfinishedMergeProblem,
} from './pr-ship.mjs';

test('#1166 ciWaitDisposition: 0 → green', () => {
  assert.equal(ciWaitDisposition(0), 'green');
});

test('#1166 ciWaitDisposition: 2 (none) и 3 (timeout-running) → transient (повтор с --resume)', () => {
  assert.equal(ciWaitDisposition(2), 'transient');
  assert.equal(ciWaitDisposition(3), 'transient');
});

test('#1166 ciWaitDisposition: 1 red / 4 error / 5 approval → fatal (ship падает честно)', () => {
  assert.equal(ciWaitDisposition(1), 'fatal');
  assert.equal(ciWaitDisposition(4), 'fatal');
  assert.equal(ciWaitDisposition(5), 'fatal');
});

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
    ['branch', 'commit', 'push', 'pr-create', 'ci-wait', 'review-gate', 'merge', 'verify', 'branch-cleanup', 'sync-fetch', 'land-guard', 'land-rebase'],
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

// ─── #700: --merge-only — безопасный мердж уже открытого PR ──────────────────────

test('#700: --merge-only даёт ТОЛЬКО merge-хвост, без branch/commit/push/pr-create', () => {
  const { steps, title, commitBody } = planPrShip({ mergeOnly: true, currentBranch: 'fix/x' });
  assert.deepEqual(
    steps.map((s) => s.label),
    ['ci-wait', 'review-gate', 'merge', 'verify', 'branch-cleanup', 'sync-fetch', 'land-guard', 'land-rebase'],
  );
  assert.equal(title, '', 'merge-only не строит заголовок (PR уже открыт)');
  assert.equal(commitBody, '', 'merge-only ничего не коммитит');
});

test('ATF4-1: assertPrMergeableForShip STOP на CONFLICTING/DIRTY', () => {
  assert.throws(
    () => assertPrMergeableForShip({ mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY', branch: 'feat/x' }),
    /STOP до merge/u,
  );
  assert.throws(
    () =>
      assertPrMergeableForShip({
        mergeable: 'CONFLICTING',
        mergeStateStatus: 'DIRTY',
        touchesRegistry: true,
        prNumber: 1023,
      }),
    /task:pr-land 1023/u,
  );
  assert.throws(
    () => assertPrMergeableForShip({ mergeable: 'MERGEABLE', mergeStateStatus: 'DIRTY' }),
    /DIRTY/u,
  );
  assert.doesNotThrow(() =>
    assertPrMergeableForShip({ mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' }),
  );
  assert.doesNotThrow(() => assertPrMergeableForShip({}));
});

test('ATF4-3: pr-create использует --body-file + bodyText, не --body', () => {
  const { steps } = planPrShip({ type: 'feat', message: 'x', issue: 1, branch: 'feat/x' });
  const create = steps.find((s) => s.label === 'pr-create');
  assert.ok(create.args.includes('--body-file'));
  assert.ok(!create.args.includes('--body'));
  assert.equal(create.bodyText, 'Closes #1');
  assert.ok(create.args.includes('__BODY_FILE__'));
});

test('#700: --merge-only мёржит без --delete-branch, remote-ветку чистит отдельным шагом', () => {
  const { steps } = planPrShip({ mergeOnly: true, currentBranch: 'fix/x' });
  assert.deepEqual(steps.find((s) => s.label === 'merge').args, ['pr', 'merge', '--squash']);
  const cleanup = steps.find((s) => s.label === 'branch-cleanup');
  assert.deepEqual(cleanup.args, ['push', 'origin', '--delete', 'fix/x']);
  assert.equal(cleanup.optional, true, 'неуспех cleanup не роняет уже успешный merge');
});

test('#700: --merge-only не требует type/message (PR уже есть)', () => {
  assert.doesNotThrow(() => planPrShip({ mergeOnly: true, currentBranch: 'fix/x' }));
});

test('#700: --merge-only worktree-aware — base занят соседним деревом → sync без checkout', () => {
  const { steps, skippedSync } = planPrShip({
    mergeOnly: true,
    currentBranch: 'fix/x',
    worktreeBranches: ['main'],
  });
  const labels = steps.map((s) => s.label);
  assert.ok(!labels.includes('sync-checkout'));
  assert.ok(labels.includes('sync-fetch'));
  assert.match(skippedSync, /другой worktree/u);
});

test('#700: --merge-only несовместим с --branch и с --no-merge', () => {
  assert.throws(() => planPrShip({ mergeOnly: true, branch: 'fix/x' }), /--merge-only несовместим с --branch/u);
  assert.throws(() => planPrShip({ mergeOnly: true, merge: false }), /--merge-only и --no-merge/u);
});

test('#700: планировщики full и merge-only несут ОДИН merge-хвост (без дублей)', () => {
  // Гарантия Структурщика: правку безопасного мерджа делаем в одном месте (planMergeTail).
  const tail = planMergeTail({ currentBranch: 'fix/x' }).steps.map((s) => s.label);
  const full = planPrShip({ type: 'fix', message: 'x', currentBranch: 'fix/x' }).steps;
  const fullTail = full.slice(full.findIndex((s) => s.label === 'ci-wait')).map((s) => s.label);
  const mergeOnly = planPrShip({ mergeOnly: true, currentBranch: 'fix/x' }).steps.map((s) => s.label);
  assert.deepEqual(fullTail, tail, 'full-флоу использует тот же хвост');
  assert.deepEqual(mergeOnly, tail, 'merge-only использует тот же хвост');
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

test('planPrShip --land-on-base: ff-sync через origin/base, не голый pull', () => {
  const { steps } = planPrShip({ type: 'feat', message: 'x', base: 'main', landOnBase: true });
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

test('base свободен → дерево садится на СВОЮ ветку вровень со стволом (умолчание #1759)', () => {
  const { steps, skippedSync } = planPrShip({
    type: 'feat',
    message: 'x',
    worktreeBranches: ['feat/other'],
  });
  assert.deepEqual(
    steps.map((s) => s.label),
    ['commit', 'push', 'pr-create', 'ci-wait', 'review-gate', 'merge', 'verify', 'sync-fetch', 'land-guard', 'land-rebase'],
  );
  assert.match(skippedSync ?? '', /вровень с origin\/main/u, 'хвост объясняет конечное состояние дерева, а не молчит');
});

test('без сведений о worktree: хвост перецеливает ветку, а не садится на base (#1759)', () => {
  const { steps } = planPrShip({ type: 'feat', message: 'x' });
  const labels = steps.map((s) => s.label);
  assert.ok(labels.includes('land-rebase'), 'умолчание — своя ветка вровень со стволом');
  assert.ok(!labels.includes('sync-checkout'), 'на base по умолчанию не садимся: утро считает держателя main находкой (#1232)');
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

// --- #1465 Ф2: --with-review убирает ручную пересадку между шагами -------------------------

test('без --with-review гейт зовётся как раньше — умолчание не меняется', () => {
  assert.deepEqual(reviewGateArgs(), ['scripts/review-gate.mjs', '--publish']);
  assert.deepEqual(reviewGateArgs(false), ['scripts/review-gate.mjs', '--publish']);
});

test('ВЕЩДОК 29.07: --with-review добавляет --ensure — связка gate→review→merge-only не руками', () => {
  // PR #1461 и #1464: одна и та же пересадка двумя командами, знак в знак.
  assert.deepEqual(reviewGateArgs(true), ['scripts/review-gate.mjs', '--publish', '--ensure']);
});

test('--with-review доезжает до шага хвоста, а не теряется в опциях', () => {
  const { steps } = planMergeTail({ currentBranch: 'fix/x', withReview: true });
  const gate = steps.find((s) => s.label === 'review-gate');
  assert.ok(gate.args.includes('--ensure'));
});

test('--with-review работает и в --auto: сервер сольёт только после вердикта', () => {
  const { steps } = planMergeTail({ auto: true, branch: 'feat/x', withReview: true });
  assert.ok(steps[0].args.includes('--ensure'));
  assert.equal(steps[1].label, 'merge-auto');
});

test('--with-review не переставляет шаги: гейт по-прежнему ПОСЛЕ ci-wait и ПЕРЕД merge', () => {
  const labels = planMergeTail({ currentBranch: 'fix/x', withReview: true }).steps.map((s) => s.label);
  assert.ok(labels.indexOf('ci-wait') < labels.indexOf('review-gate'));
  assert.ok(labels.indexOf('review-gate') < labels.indexOf('merge'));
});

// --- #1261: ship не врёт и не проигрывает гонку --------------------------------------------

test('--auto: слияние отдаётся серверу, локальные ci-wait/verify не планируются', () => {
  const { steps, skippedSync } = planMergeTail({ auto: true, branch: 'feat/x' });
  const labels = steps.map((s) => s.label);
  assert.deepEqual(labels, ['review-gate', 'merge-auto']);
  assert.deepEqual(steps[1].args, ['pr', 'merge', '--squash', '--auto']);
  // Шип-гейт (#924) стоит ПЕРЕД взводом автослияния: сервер сольёт по зелёному,
  // но ревью тимлида обязано состояться до того, иначе PR повиснет в pending.
  assert.equal(steps[0].label, 'review-gate');
  assert.match(skippedSync, /сервер/);
  // Гонка 26.07: PR #1248/#1253/#1256 становились CONFLICTING уже ПОСЛЕ зелёного CI.
  assert.ok(!labels.includes('ci-wait'), 'локальное ожидание — то самое окно, в котором уезжает base');
});

test('--auto не отменяет обычный путь: без флага хвост прежний', () => {
  const labels = planMergeTail({ branch: 'feat/x' }).steps.map((s) => s.label);
  assert.deepEqual(labels.slice(0, 5), ['ci-wait', 'review-gate', 'merge', 'verify', 'branch-cleanup']);
});

test('sync-шаги несут guard base-free — предикат перепроверяется в момент исполнения', () => {
  const { steps } = planMergeTail({ branch: 'feat/x', worktreeBranches: [], landOnBase: true });
  const guarded = steps.filter((s) => s.guard === 'base-free').map((s) => s.label);
  // План строится ДО ci-wait (минуты), за это время сосед может занять base — 26.07 так и
  // случилось: PR #1256 смёржен, ветка снесена, ship упал на checkout main.
  assert.deepEqual(guarded, ['sync-checkout', 'sync-ff']);
});

test('base уже занят на этапе плана — ff-sync не планируется вовсе (прежнее поведение)', () => {
  const { steps, skippedSync } = planMergeTail({ branch: 'feat/x', worktreeBranches: ['main'] });
  const labels = steps.map((s) => s.label);
  assert.ok(!labels.includes('sync-checkout'));
  assert.ok(labels.includes('sync-fetch'), 'origin/base обновить всё равно надо');
  assert.match(skippedSync, /держит другой worktree/);
});

test('planPrShip прокидывает --auto в хвост и в merge-only', () => {
  const full = planPrShip({ type: 'feat', scope: 'x', message: 'm', auto: true, commit: false, currentBranch: 'feat/x' });
  assert.ok(full.steps.some((s) => s.label === 'merge-auto'));
  const only = planPrShip({ mergeOnly: true, auto: true, currentBranch: 'feat/x', type: 'feat', message: 'm' });
  assert.ok(only.steps.some((s) => s.label === 'merge-auto'));
  assert.ok(!only.steps.some((s) => s.label === 'ci-wait'));
});

test('--auto без разрешения репозитория откатывается на ожидание, а не вешает PR', () => {
  // Живой случай 26.07: первый прогон --auto дал «Auto merge is not allowed for this
  // repository» и оставил PR #1269 открытым. allow_auto_merge — настройка владельца.
  const denied = autoMergeDecision({ requested: true, allowed: false });
  assert.equal(denied.mode, 'wait');
  assert.match(denied.note, /allow_auto_merge=false/);
  assert.match(denied.note, /Allow auto-merge/, 'сообщение должно говорить, ЧТО включить');

  // Одной галки НЕ достаточно: см. отдельный тест про обязательные проверки.
  assert.equal(autoMergeDecision({ requested: true, allowed: true, requiredChecks: ['CI'] }).mode, 'auto');

  // gh недоступен — не гадаем, идём безопасным путём и говорим об этом.
  const unknown = autoMergeDecision({ requested: true, allowed: null });
  assert.equal(unknown.mode, 'wait');
  assert.match(unknown.note, /не удалось выяснить/);

  // Без флага решение молчит.
  assert.deepEqual(autoMergeDecision({}), { mode: 'wait', note: null });
});

test('--auto без обязательных проверок у base отказывается: сервер слил бы СРАЗУ, мимо CI', () => {
  // Найдено двумя сессиями независимо 26.07. Симптомы разные, дефект один: предикат
  // спрашивал про галку allow_auto_merge, а условие сервера — правила защиты ветки.
  // У меня (проверки не обязательны) PR #1276/#1278 слились за секунды БЕЗ зелёного CI;
  // у соседней сессии GitHub отказал «Protected branch rules not configured».
  const unprotected = autoMergeDecision({ requested: true, allowed: true, requiredChecks: [] });
  assert.equal(unprotected.mode, 'wait');
  assert.match(unprotected.note, /НЕТ обязательных проверок/);
  assert.match(unprotected.note, /минуя CI/, 'риск должен быть назван прямо');

  const protectedBase = autoMergeDecision({ requested: true, allowed: true, requiredChecks: ['CI', 'Turbo unit tests'] });
  assert.equal(protectedBase.mode, 'auto');
  assert.equal(protectedBase.note, null);

  // Галка выключена — прежняя ветка решения не сломана.
  assert.equal(autoMergeDecision({ requested: true, allowed: false, requiredChecks: ['CI'] }).mode, 'wait');
});

test('--merge-only при расхождении с origin отказывается, а не мержит чужое', () => {
  // Находка соседней сессии 26.07. Норма #700 держит merge-only БЕЗ push намеренно,
  // поэтому лечим не отправкой, а громким отказом: мердж взял бы содержание из origin.
  const problem = headSyncProblem({ local: 'a'.repeat(40), remote: 'b'.repeat(40) });
  assert.match(problem, /не совпадает с origin/);
  assert.match(problem, /git push/, 'отказ обязан называть команду выхода');
  assert.equal(headSyncProblem({ local: 'a'.repeat(40), remote: 'a'.repeat(40) }), null);
  // Upstream не настроен — не выдумываем проблему.
  assert.equal(headSyncProblem({ local: 'a'.repeat(40), remote: null }), null);
  assert.equal(headSyncProblem({}), null);
});

test('#700 сохранён: merge-only по-прежнему без push/commit/pr-create', () => {
  const { steps } = planPrShip({ mergeOnly: true, currentBranch: 'feat/x', type: 'feat', message: 'm' });
  const labels = steps.map((s) => s.label);
  assert.ok(!labels.includes('push'));
  assert.ok(!labels.includes('commit'));
  assert.ok(!labels.includes('pr-create'));
});

test('#1321: живой MERGE_HEAD — стоп с текстом ремонта, а не «Everything up-to-date» видом успеха', () => {
  const problem = unfinishedMergeProblem({ mergeHeadPath: 'C:/repo/.git/worktrees/tree/MERGE_HEAD' });
  assert.match(problem, /MERGE_HEAD жив/u);
  assert.match(problem, /git commit/u, 'ремонт назван: завершить');
  assert.match(problem, /git merge --abort/u, 'ремонт назван: отменить');
  assert.match(problem, /Молчаливый зелёный/u, 'референс зверя B6 на месте');
});

test('#1321: слияние не висит (или выяснить нельзя) — гард молчит', () => {
  assert.equal(unfinishedMergeProblem({ mergeHeadPath: null }), null);
  assert.equal(unfinishedMergeProblem({}), null);
});

test('--issue-mention: упоминание в заголовке легально, тело несёт Issue без Closes', () => {
  const { steps } = planPrShip({ type: 'chore', message: 'архив со свидетельством PR #1316', issueMention: '1298', currentBranch: 'feat/x' });
  const create = steps.find((s) => s.label === 'pr-create');
  assert.match(create.bodyText, /Issue: #1298/u);
  assert.ok(!create.bodyText.includes('Closes'));
});

test('--issue и --issue-mention вместе — отказ (закрыть ИЛИ упомянуть)', () => {
  assert.throws(
    () => planPrShip({ type: 'feat', message: 'x', issue: '5', issueMention: '6', currentBranch: 'feat/x' }),
    /взаимоисключают/u,
  );
});

test('--body-file: pr-create несёт маркер пользовательского файла, Closes из --issue не теряется в коммите', () => {
  const { steps, commitBody } = planPrShip({ type: 'feat', message: 'y', issue: '7', bodyFile: '/tmp/b.md', currentBranch: 'feat/x' });
  const create = steps.find((s) => s.label === 'pr-create');
  assert.equal(create.bodyText, '__USER_BODY_FILE__/tmp/b.md');
  assert.match(commitBody, /Closes #7/u);
});

test('--keep-branch: хвост не переключает дерево на base (28.07, гейт #1232)', () => {
  const withFlag = planPrShip({
    type: 'fix', scope: 'x', message: 'm', commit: false, wait: false,
    currentBranch: 'fix/my-work', keepBranch: true,
  });
  const labels = withFlag.steps.map((s) => s.label);
  assert.ok(!labels.includes('sync-checkout'), 'дерево остаётся на рабочей ветке');
  assert.ok(labels.includes('sync-fetch'), 'origin/base всё равно обновляется');
  assert.match(withFlag.skippedSync ?? '', /keep-branch/u, 'причина пропуска названа вслух');

  // С 08.08 (#1759) умолчание тоже не садится на base — различие в другом: --keep-branch
  // оставляет дерево на ПРЕЖНЕЙ голове, умолчание перецеливает ветку на свежий ствол.
  const without = planPrShip({
    type: 'fix', scope: 'x', message: 'm', commit: false, wait: false,
    currentBranch: 'fix/my-work',
  });
  const labels2 = without.steps.map((s) => s.label);
  assert.ok(!labels2.includes('sync-checkout'), 'умолчание на base не садится');
  assert.ok(labels2.includes('land-rebase'), 'умолчание перецеливает ветку вровень со стволом');
  assert.ok(!labels.includes('land-rebase'), '--keep-branch голову НЕ двигает — в этом и разница');
});

test('--keep-branch: флаг ДОХОДИТ из CLI (28.07 — правка легла мимо парсера, план молчал)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./pr-ship.mjs', import.meta.url), 'utf8');
  assert.match(src, /a === '--keep-branch'\) o\.keepBranch = true/u, 'парсер обязан знать флаг');
});

// ─── #1759: хвост больше не сажает дерево на base ────────────────────────────────

test('#1759 (а): после мерджа дерево на СВОЕЙ ветке вровень со стволом, base не удерживается', () => {
  const { steps, skippedSync } = planMergeTail({ branch: 'sprint/x', worktreeBranches: [] });
  const labels = steps.map((s) => s.label);
  assert.ok(!labels.includes('sync-checkout'), 'checkout в base — вот что делало дерево держателем');
  const rebase = steps.find((s) => s.label === 'land-rebase');
  assert.deepEqual(rebase.args, ['checkout', '-B', 'sprint/x', 'origin/main']);
  assert.match(skippedSync ?? '', /никто не держит/u, 'конечное состояние названо вслух');
});

test('#1759 (б): движение ветки прикрыто гвардом ДО действия, а не откатом после', () => {
  const { steps } = planMergeTail({ branch: 'sprint/x', worktreeBranches: [] });
  const labels = steps.map((s) => s.label);
  const guardAt = labels.indexOf('land-guard');
  const rebaseAt = labels.indexOf('land-rebase');
  assert.ok(guardAt > -1, 'гвард есть');
  assert.ok(guardAt < rebaseAt, 'отказ ДО перецеливания: откат после — уже потеря');
});

test('#1759: гвард ЗОВЁТ единственный носитель предиката, а не заводит вторую копию', () => {
  const { steps } = planMergeTail({ branch: 'sprint/x', worktreeBranches: [] });
  const guard = steps.find((s) => s.label === 'land-guard');
  assert.equal(guard.cmd, 'node');
  assert.ok(guard.args.includes('scripts/branch-status.mjs'), 'условие резчика: один предикат — один носитель');
  assert.ok(guard.args.includes('--branch') && guard.args.includes('sprint/x'), 'ветка названа явно, а не берётся из HEAD после мерджа');
});

test('#1759: «сесть на base» осталось возможным — но флагом, не умолчанием', () => {
  const { steps } = planMergeTail({ branch: 'sprint/x', worktreeBranches: [], landOnBase: true });
  const labels = steps.map((s) => s.label);
  assert.ok(labels.includes('sync-checkout') && labels.includes('sync-ff'));
  assert.ok(!labels.includes('land-rebase'));
});

test('#1759: флаг --land-on-base ДОХОДИТ из CLI (урок 28.07: правка легла мимо парсера)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./pr-ship.mjs', import.meta.url), 'utf8');
  assert.match(src, /a === '--land-on-base'\) o\.landOnBase = true/u, 'парсер обязан знать флаг');
  assert.match(src, /landOnBase: opts\.landOnBase/u, 'флаг обязан доехать до планировщика');
});

test('#1759: base занят соседом — по-прежнему только fetch, чужое дерево не трогаем', () => {
  const { steps, skippedSync } = planMergeTail({ branch: 'sprint/x', worktreeBranches: ['main'] });
  const labels = steps.map((s) => s.label);
  assert.deepEqual(labels.filter((l) => l.startsWith('land-')), [], 'при занятой базе перецеливание не планируется');
  assert.ok(labels.includes('sync-fetch'));
  assert.match(skippedSync, /другой worktree/u);
});
