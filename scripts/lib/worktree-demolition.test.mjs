/**
 * ADR-0020: контролируемый снос worktree состоит из закрытого набора фреймов,
 * а пост-чек сравнивает все живые деревья после каждого снятого дерева.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEMOLITION_FRAMES,
  analyzeLiveTreePostCheck,
  formatPostCheckFinding,
  frameLine,
  snapshotFindings,
} from './worktree-demolition.mjs';

test('фреймы сноса закрыты и идут в порядке ADR-0020', () => {
  assert.deepEqual(
    DEMOLITION_FRAMES.map((f) => f.id),
    [
      'snapshot-live-trees',
      'neutralize-outbound-links',
      'git-worktree-remove',
      'assert-target-absent',
      'postcheck-live-trees',
      'allow-next-tree',
    ],
  );
});

test('frameLine печатает номер кадра и номер дерева в пачке', () => {
  assert.match(
    frameLine('postcheck-live-trees', { index: 2, total: 4, path: 'C:/w/Membrana-codex' }),
    /^  frame 5\/6 дерево 2\/4: пост-чек всех живых деревьев · C:\/w\/Membrana-codex$/,
  );
});

test('snapshotFindings: missing/error в живом дереве — стоп до сноса', () => {
  assert.deepEqual(snapshotFindings([{ path: 'C:/w/a', state: 'ok', porcelain: '' }]), []);
  assert.deepEqual(snapshotFindings([{ path: 'C:/w/b', state: 'missing' }]), [
    { type: 'live-tree-missing', path: 'C:/w/b', message: 'missing' },
  ]);
});

test('post-check ловит новые удаления в любом живом дереве, не только в main', () => {
  const before = [
    { path: 'C:/w/Membrana', state: 'ok', porcelain: '' },
    { path: 'C:/w/Membrana-codex', state: 'ok', porcelain: ' M docs/HANDOFF.md' },
  ];
  const after = [
    { path: 'C:/w/Membrana', state: 'ok', porcelain: '' },
    { path: 'C:/w/Membrana-codex', state: 'ok', porcelain: ' M docs/HANDOFF.md\n D packages/core/src/index.ts' },
  ];

  const findings = analyzeLiveTreePostCheck(before, after);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].path, 'C:/w/Membrana-codex');
  assert.deepEqual(findings[0].deletions, ['packages/core/src/index.ts']);
  assert.match(formatPostCheckFinding(findings[0]), /Membrana-codex: 1 новых удалений/);
});

test('post-check не считает уже бывшее удаление новой находкой', () => {
  const before = [{ path: 'C:/w/Membrana', state: 'ok', porcelain: ' D docs/old.md' }];
  const after = [{ path: 'C:/w/Membrana', state: 'ok', porcelain: ' D docs/old.md' }];
  assert.deepEqual(analyzeLiveTreePostCheck(before, after), []);
});

test('post-check стопорит пропавшее или непроверяемое живое дерево', () => {
  const before = [
    { path: 'C:/w/Membrana', state: 'ok', porcelain: '' },
    { path: 'C:/w/Membrana-product', state: 'ok', porcelain: '' },
  ];
  assert.deepEqual(analyzeLiveTreePostCheck(before, [{ path: 'C:/w/Membrana', state: 'error', error: 'git failed' }]), [
    { type: 'status-error', path: 'C:/w/Membrana', message: 'git failed' },
    {
      type: 'live-tree-missing',
      path: 'C:/w/Membrana-product',
      message: 'дерево было живым до сноса, но отсутствует в пост-чеке',
    },
  ]);
});
