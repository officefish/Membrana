/**
 * Тесты ядра слияния в отдельном дереве (#1272 Ф3).
 *
 * Эпизод 26.07: общее дерево держали чужие незакоммиченные правки — слить базу нельзя,
 * переключиться нельзя, трогать чужое запрещено. Поднимал отдельное дерево руками
 * четырьмя командами, дважды за сессию, и один раз чуть не оставил его сиротой.
 *
 * Ядро чистое: ни git, ни fs — только план и вердикты.
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  classifyOutcome,
  planIsolatedMerge,
  refusalsBeforeMerge,
  worktreePathFor,
} from './lib/isolated-merge.mjs';

test('путь дерева выводится из имени ветки и детерминирован', () => {
  const a = worktreePathFor('feat/audit-concentrate-v1', '/repos');
  const b = worktreePathFor('feat/audit-concentrate-v1', '/repos');
  assert.equal(a, b, 'одинаковый вход — одинаковый путь (без даты и случайности)');
  assert.match(a, /Membrana-merge-feat-audit-concentrate-v1$/);
});

test('отказы до работы: без ветки, без базы, ветка = база, ветки нет', () => {
  assert.ok(refusalsBeforeMerge({ base: 'origin/main' }).some((r) => r.includes('не указана ветка')));
  assert.ok(refusalsBeforeMerge({ branch: 'feat/x' }).some((r) => r.includes('не указана база')));
  assert.ok(
    refusalsBeforeMerge({ branch: 'main', base: 'main' }).some((r) => r.includes('совпадают')),
    'сливать ветку саму с собой — отказ, а не пустая работа',
  );
  assert.ok(
    refusalsBeforeMerge({ branch: 'feat/нет', base: 'origin/main', branchExists: false }).some((r) => r.includes('нет ни локально')),
  );
});

test('занятый каталог — отказ, а не молчаливая перезапись чужого дерева', () => {
  const r = refusalsBeforeMerge({ branch: 'feat/x', base: 'origin/main', pathBusy: true });
  assert.ok(r.some((x) => x.includes('занят')));
});

test('ветка выдана текущему дереву → отсоединённая голова, а не отказ', () => {
  const r = refusalsBeforeMerge({ branch: 'feat/x', base: 'origin/main', checkedOutHere: true });
  assert.ok(r.includes('__detach__'), 'двойной чекаут запрещён git — работаем detach');
  assert.equal(r.filter((x) => x !== '__detach__').length, 0, 'это не жёсткий отказ');
});

test('план: пять шагов, отправка в явный ref при отсоединённой голове', () => {
  const plain = planIsolatedMerge({ branch: 'feat/x', base: 'origin/main', path: '/tmp/w', detach: false });
  assert.deepEqual(plain.map((s) => s.id), ['fetch', 'add', 'merge', 'push', 'remove']);
  assert.deepEqual(plain[3].args, ['push', 'origin', 'HEAD']);

  const detached = planIsolatedMerge({ branch: 'feat/x', base: 'origin/main', path: '/tmp/w', detach: true });
  assert.ok(detached[1].args.includes('--detach'));
  assert.deepEqual(detached[3].args, ['push', 'origin', 'HEAD:feat/x'], 'иначе отсоединённая голова никуда не приедет');
});

test('конфликт — не провал: дерево остаётся для разбора и назван путь', () => {
  const r = classifyOutcome({ mergeOk: false, path: '/tmp/w' });
  assert.equal(r.state, 'conflict');
  assert.equal(r.keepWorktree, true, 'убрать дерево = потерять разрешённый конфликт');
  assert.match(r.message, /\/tmp\/w/);
  assert.match(r.message, /--cleanup/, 'сказано, как убрать после разбора');
});

test('неудачная отправка тоже сохраняет дерево', () => {
  const r = classifyOutcome({ mergeOk: true, pushOk: false, path: '/tmp/w' });
  assert.equal(r.state, 'push-failed');
  assert.equal(r.keepWorktree, true, 'работа не выбрасывается из-за сети');
});

test('успех убирает за собой — сирот не остаётся', () => {
  const r = classifyOutcome({ mergeOk: true, pushOk: true, path: '/tmp/w' });
  assert.equal(r.state, 'ok');
  assert.equal(r.keepWorktree, false);
});
