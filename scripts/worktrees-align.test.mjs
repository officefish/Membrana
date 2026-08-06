/**
 * Зубы провода выравнивания (блок `align-cli-report`, спринт `worktrees-align`, #1738).
 *
 * ГЛАВНОЕ, ЧТО ЗДЕСЬ ДЕРЖИТСЯ — сухой прогон не мутирует и говорит владельцу всё, чтобы дать
 * гейт НЕ ЧИТАЯ КОД (контракт Веснина): состояние каждого дерева, намеченный исход с причиной,
 * пути будущего снимка и явное слово о том, что мутаций не было. Второе — код выхода: гейт
 * обязан быть машинно проверяем, а не «видно в логе».
 *
 * git и fs подменены фикстурой: живых деревьев для проверки нет (#1738, риск №1), и проверять
 * защиту «сухой не пишет» настоящими деревьями значит однажды её и не проверить.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  EXIT,
  decideExitCode,
  parseWorktreeList,
  renderDryRun,
  runAlign,
} from './worktrees-align.mjs';

const PORCELAIN = [
  'worktree C:/w/Membrana',
  'HEAD abc',
  'branch refs/heads/main',
  '',
  'worktree C:/w/Membrana-x',
  'HEAD def',
  'branch refs/heads/feat/x',
  '',
  'worktree C:/w/Membrana-detached',
  'HEAD 999',
].join('\n');

/** Фикстура io: помнит мутирующие вызовы, чтобы «сухой не пишет» проверялось фактом. */
function fakeIo(trees) {
  const mutations = [];
  return {
    mutations,
    git(cwd, args) {
      if (['add', 'commit', 'merge'].includes(args[0])) mutations.push(`${cwd}: ${args.join(' ')}`);
      return '';
    },
    now: () => '2026-08-06T11:00:00+03:00',
    listWorktrees: () => trees.map((t) => ({ path: t.tree, branch: t.branch })),
    readCard: (p) => trees.find((t) => t.tree === p)?.card ?? null,
    readState: (p) => {
      const t = trees.find((x) => x.tree === p) ?? {};
      return {
        head: 'h0',
        porcelainEmpty: (t.dirtyFiles ?? []).length === 0,
        dirtyCount: (t.dirtyFiles ?? []).length,
        dirtyFiles: t.dirtyFiles ?? [],
        unmergedPaths: [],
        mergeHead: false,
        inProgressHeads: t.inProgressHeads ?? [],
      };
    },
    counts: (branch) => {
      const t = trees.find((x) => x.branch === branch) ?? {};
      return { behind: t.behind ?? 0, ahead: t.ahead ?? 0 };
    },
  };
}

const sprint = { kind: 'sprint' };

// ─── разбор инвентаря ────────────────────────────────────────────────────────────

test('porcelain разбирается, detached даёт branch=null', () => {
  const list = parseWorktreeList(PORCELAIN);
  assert.equal(list.length, 3);
  assert.deepEqual(list[1], { path: 'C:/w/Membrana-x', branch: 'feat/x' });
  assert.equal(list[2].branch, null, 'detached обязан быть виден как отсутствие ветки');
});

test('пустой ввод не роняет разбор', () => {
  assert.deepEqual(parseWorktreeList(''), []);
  assert.deepEqual(parseWorktreeList(null), []);
});

// ─── сухой прогон: ни одной мутации ──────────────────────────────────────────────

test('сухой прогон не делает НИ ОДНОГО мутирующего вызова git', () => {
  const io = fakeIo([
    { tree: 'C:/w/a', branch: 'feat/a', card: sprint, behind: 10, ahead: 0, dirtyFiles: ['docs/A.md'] },
    { tree: 'C:/w/b', branch: 'feat/b', card: sprint, behind: 3, ahead: 2, dirtyFiles: [] },
  ]);
  runAlign({ io, apply: false });
  assert.deepEqual(io.mutations, [], 'сухой прогон обязан быть немым для git add/commit/merge');
});

test('сухой прогон показывает пути будущего снимка — без них гейт владельца слеп', () => {
  const io = fakeIo([
    { tree: 'C:/w/a', branch: 'feat/a', card: sprint, behind: 10, ahead: 0, dirtyFiles: ['docs/A.md', 'scripts/b.mjs'] },
  ]);
  const { lines } = runAlign({ io, apply: false });
  const text = lines.join('\n');
  assert.match(text, /файлы, которые попадут в защитный снимок/);
  assert.match(text, /docs\/A\.md/);
  assert.match(text, /scripts\/b\.mjs/);
});

test('сухой прогон явно говорит, что мутаций не было и чем их запустить', () => {
  const io = fakeIo([{ tree: 'C:/w/a', branch: 'feat/a', card: sprint, behind: 1, ahead: 0 }]);
  const text = runAlign({ io, apply: false }).lines.join('\n');
  assert.match(text, /СУХОЙ прогон, ни одной мутации не произведено/);
  assert.match(text, /повторить с --apply/);
});

test('сухой прогон называет причину по каждому дереву, а не молчит', () => {
  const io = fakeIo([
    { tree: 'C:/w/rebase', branch: 'feat/r', card: sprint, behind: 5, ahead: 0, inProgressHeads: ['REBASE_HEAD'] },
    { tree: 'C:/w/nocard', branch: 'feat/n', card: null, behind: 5, ahead: 0 },
  ]);
  const text = runAlign({ io, apply: false }).lines.join('\n');
  assert.match(text, /REBASE_HEAD/);
  assert.match(text, /не зарегистрировано/);
});

// ─── коды выхода: гейт машинно проверяем ─────────────────────────────────────────

test('всё выравнивается — код 0', () => {
  const io = fakeIo([{ tree: 'C:/w/a', branch: 'feat/a', card: sprint, behind: 4, ahead: 0 }]);
  assert.equal(runAlign({ io, apply: false }).exitCode, EXIT.OK);
});

test('«не отстало» само по себе код не портит', () => {
  const io = fakeIo([{ tree: 'C:/w/a', branch: 'feat/a', card: sprint, behind: 0, ahead: 0 }]);
  assert.equal(runAlign({ io, apply: false }).exitCode, EXIT.OK);
});

test('дерево, требующее человека, даёт ненулевой код', () => {
  const io = fakeIo([
    { tree: 'C:/w/r', branch: 'feat/r', card: sprint, behind: 5, ahead: 0, inProgressHeads: ['REBASE_HEAD'] },
  ]);
  assert.equal(runAlign({ io, apply: false }).exitCode, EXIT.NEEDS_HUMAN);
});

test('брошенное грязным дерево — отдельный код, худший исход не путается с конфликтом', () => {
  assert.equal(decideExitCode({ leftDirty: [{}], conflicts: [], skipped: [] }), EXIT.TREE_LEFT_DIRTY);
  assert.equal(decideExitCode({ leftDirty: [], conflicts: [{}], skipped: [] }), EXIT.NEEDS_HUMAN);
  assert.notEqual(EXIT.TREE_LEFT_DIRTY, EXIT.NEEDS_HUMAN);
});

// ─── мутирующий прогон ───────────────────────────────────────────────────────────

test('--apply делает снимок ПЕРЕД merge и показывает команду отката', () => {
  const io = fakeIo([
    { tree: 'C:/w/a', branch: 'feat/a', card: sprint, behind: 6, ahead: 0, dirtyFiles: ['docs/A.md'] },
  ]);
  let head = 0;
  io.git = (cwd, args) => {
    if (['add', 'commit', 'merge'].includes(args[0])) io.mutations.push(`${cwd}: ${args[0]}`);
    if (args[0] === 'rev-parse' && args[1] === 'HEAD^') return 'h0';
    if (args[0] === 'rev-parse') return (head++ === 0 ? 'h0' : 'h1');
    if (args[0] === 'show') return 'docs/A.md';
    return '';
  };
  const { lines } = runAlign({ io, apply: true });
  const order = io.mutations.map((m) => m.split(': ')[1]);
  assert.ok(order.indexOf('add') < order.indexOf('merge'), 'снимок обязан идти перед слиянием');
  assert.match(lines.join('\n'), /откат: git -C C:\/w\/a reset --soft h0/);
});

test('renderDryRun не притворяется успехом на пустом входе', () => {
  const text = renderDryRun({ planned: [], skipped: [], conflicts: [], snapshots: [] }).join('\n');
  assert.match(text, /деревьев на входе нет/);
  assert.match(text, /мутаций не произведено/);
});
