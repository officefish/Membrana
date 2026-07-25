import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkReadmeAgainstRegistry,
  listReadmeActiveDrift,
  runSyncReadmeCheck,
} from './lib/task-readme-check.mjs';
import { computeReadmeMatchesRegistry } from './lib/task-validity.mjs';
import { runTaskList } from './task-list.mjs';

/** @param {Partial<object> & { id: string }} t */
function card(t) {
  return {
    title: t.title ?? t.id,
    status: t.status ?? 'active',
    size: t.size ?? 'M',
    ...t,
  };
}

function readmeWith(ids) {
  const rows = ids.map((id) => `| \`${id}\` | t | M | [p](x) | — |`).join('\n');
  return `## Активные задачи\n\n| ID | Название | Размер | Промпт | GitHub |\n|----|----------|--------|--------|--------|\n${rows}\n\n## Архив\n`;
}

test('listReadmeActiveDrift: missing / extra', () => {
  const cards = [card({ id: 'a' }), card({ id: 'b' })];
  const d = listReadmeActiveDrift(cards, readmeWith(['a', 'c']));
  assert.deepEqual(d.missing, ['b']);
  assert.deepEqual(d.extra, ['c']);
});

test('checkReadmeAgainstRegistry: ok через предикат', () => {
  const cards = [card({ id: 'a' })];
  const r = checkReadmeAgainstRegistry(cards, readmeWith(['a']));
  assert.equal(r.ok, true);
  assert.equal(r.matches, true);
});

test('checkReadmeAgainstRegistry: drift → not ok', () => {
  const cards = [card({ id: 'a' })];
  const r = checkReadmeAgainstRegistry(cards, readmeWith(['a', 'ghost']));
  assert.equal(r.ok, false);
  assert.equal(r.matches, false);
  assert.ok(r.findings.some((f) => f.code === 'group.readme.drift'));
  assert.deepEqual(r.extra, ['ghost']);
});

test('тонкая обёртка: подмена предиката меняет вердикт', () => {
  const cards = [card({ id: 'a' })];
  const alwaysFalse = () => false;
  const r = checkReadmeAgainstRegistry(cards, readmeWith(['a']), {
    computeReadmeMatchesRegistry: alwaysFalse,
  });
  assert.equal(r.ok, false);
  assert.equal(computeReadmeMatchesRegistry(cards, readmeWith(['a'])), true);
});

test('runSyncReadmeCheck: fail exit 1 + missing ids', () => {
  const { code, report } = runSyncReadmeCheck({
    load: () => ({ tasks: [card({ id: 'need-me' })] }),
    readReadme: () => readmeWith([]),
  });
  assert.equal(code, 1);
  assert.match(report, /need-me/);
  assert.match(report, /FAIL/);
});

test('runSyncReadmeCheck: ok exit 0', () => {
  const { code, report } = runSyncReadmeCheck({
    load: () => ({ tasks: [card({ id: 'a' })] }),
    readReadme: () => readmeWith(['a']),
  });
  assert.equal(code, 0);
  assert.match(report, /OK/);
});

test('удаление предиката ломает check (throw)', () => {
  assert.throws(() => {
    checkReadmeAgainstRegistry([card({ id: 'a' })], readmeWith(['a']), {
      computeReadmeMatchesRegistry: () => {
        throw new Error('predicate removed');
      },
    });
  }, /predicate removed/);
});

test('runTaskList --check: exit mirrors runSyncReadmeCheck', async () => {
  const code = await runTaskList(['--sync-readme', '--check'], {
    load: () => ({ tasks: [card({ id: 'a' })] }),
    readReadme: () => readmeWith(['ghost']),
  });
  assert.equal(code, 1);
});
