/**
 * Зубы исполнителя защитного снимка (блок `dirty-wip-snapshot`, спринт `worktrees-align`, #1738).
 *
 * ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ В ПЕРВУЮ ОЧЕРЕДЬ — отказы. Исполнитель пишет в ЧУЖОЕ дерево, и цена
 * его ошибки — чужая незакоммиченная работа, заметённая в наш коммит. Поэтому половина зубов
 * про то, что `-A`, `.`, glob и абсолютный путь не пролезают, а вторая — про то, что квитанция
 * не выдаётся, если снимок сел не туда.
 *
 * git подменён фикстурой: живых деревьев для проверки нет (#1738, риск №1), да и проверять
 * защиту от `add -A` записью в настоящее дерево — значит однажды её и не проверить.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  E_SNAPSHOT_NOT_TAKEN,
  E_SNAPSHOT_PATHS_INVALID,
  WIP_SNAPSHOT_MESSAGE,
  makeWipSnapshot,
  undoCommandFor,
  validateSnapshotPaths,
} from './wip-snapshot.mjs';

/** Журналирующая фикстура git: помнит вызовы и отвечает по сценарию. */
function fakeGit(scenario = {}) {
  const calls = [];
  const heads = scenario.heads ?? ['head-before', 'head-after'];
  let headReads = 0;
  const git = (cwd, args) => {
    calls.push({ cwd, args });
    const cmd = args[0];
    if (cmd === 'rev-parse' && args[1] === '--abbrev-ref') return scenario.branch ?? 'feat/x';
    if (cmd === 'rev-parse' && args[1] === 'HEAD^') return scenario.parent ?? heads[0];
    if (cmd === 'rev-parse') {
      const v = heads[Math.min(headReads, heads.length - 1)];
      headReads += 1;
      return v;
    }
    if (cmd === 'show') return (scenario.committed ?? []).join('\n');
    // Гард охвата до коммита (#1864): staged по умолчанию = committed, чтобы прежние
    // сценарии «коммит совпал со списком» не требовали дублировать перечень дважды.
    if (cmd === 'diff') return (scenario.staged ?? scenario.committed ?? []).join('\n');
    return '';
  };
  return { git, calls, now: () => scenario.at ?? '2026-08-06T10:30:00+03:00' };
}

const okScenario = (files) => ({ heads: ['head-before', 'commit-abc'], parent: 'head-before', committed: files });

// ─── валидация путей: сюда не должны пролезать расширители охвата ────────────────

test('пустой список — отказ, а не «нечего делать»', () => {
  assert.throws(() => validateSnapshotPaths([]), (e) => e.code === E_SNAPSHOT_PATHS_INVALID);
});

test('не список — отказ: строка и argv здесь запрещены', () => {
  assert.throws(() => validateSnapshotPaths('docs/A.md'), (e) => e.code === E_SNAPSHOT_PATHS_INVALID);
  assert.throws(() => validateSnapshotPaths(null), (e) => e.code === E_SNAPSHOT_PATHS_INVALID);
});

test('расширители охвата не пролезают ни в каком виде', () => {
  for (const bad of ['-A', '-u', '--all', '.', '..', ':/', '*']) {
    assert.throws(
      () => validateSnapshotPaths(['docs/A.md', bad]),
      (e) => e.code === E_SNAPSHOT_PATHS_INVALID,
      `«${bad}» обязан быть отклонён — иначе снимок заметёт чужую работу`,
    );
  }
});

test('glob отклоняется — раскрытие путей не дело исполнителя', () => {
  for (const bad of ['docs/*.md', 'scripts/?.mjs', 'a[0-9].txt']) {
    assert.throws(() => validateSnapshotPaths([bad]), (e) => e.code === E_SNAPSHOT_PATHS_INVALID);
  }
});

test('выход за пределы дерева и абсолютные пути отклоняются', () => {
  for (const bad of ['../secrets.env', 'docs/../../x', '/etc/passwd', 'C:/Windows/x']) {
    assert.throws(() => validateSnapshotPaths([bad]), (e) => e.code === E_SNAPSHOT_PATHS_INVALID);
  }
});

test('годный список проходит и обрезается по краям', () => {
  assert.deepEqual(validateSnapshotPaths([' docs/A.md ', 'scripts/b.mjs']), ['docs/A.md', 'scripts/b.mjs']);
});

// ─── вызов git: поимённо, массивом, с `--`, без shell ────────────────────────────

test('add идёт поимённо с явным `--`, без флагов охвата', () => {
  const io = fakeGit(okScenario(['docs/A.md', 'scripts/b.mjs']));
  makeWipSnapshot(io)('C:/w/Membrana-x', ['docs/A.md', 'scripts/b.mjs']);
  const add = io.calls.find((c) => c.args[0] === 'add');
  assert.deepEqual(add.args, ['add', '--', 'docs/A.md', 'scripts/b.mjs']);
  assert.equal(add.cwd, 'C:/w/Membrana-x');
  assert.ok(!add.args.includes('-A') && !add.args.includes('.'));
});

test('коммит идёт с --no-verify и дословным сообщением прецедента', () => {
  const io = fakeGit(okScenario(['docs/A.md']));
  makeWipSnapshot(io)('C:/w/Membrana-x', ['docs/A.md']);
  const commit = io.calls.find((c) => c.args[0] === 'commit');
  assert.deepEqual(commit.args, ['commit', '--no-verify', '-m', WIP_SNAPSHOT_MESSAGE]);
  assert.equal(WIP_SNAPSHOT_MESSAGE, 'chore: wip snapshot before main-align');
});

test('исполнитель не зовёт status/ls-files — файлы выбирает ядро, не он', () => {
  const io = fakeGit(okScenario(['docs/A.md']));
  makeWipSnapshot(io)('C:/w/Membrana-x', ['docs/A.md']);
  const verbs = io.calls.map((c) => c.args[0]);
  for (const forbidden of ['status', 'ls-files', 'stash', 'checkout', 'push', 'tag']) {
    assert.ok(!verbs.includes(forbidden), `исполнитель не имеет права звать ${forbidden}`);
  }
});

// ─── квитанция: снимок обязан быть отматываемым ──────────────────────────────────

test('квитанция несёт родителя — без него reset --soft не к чему прицепить', () => {
  const io = fakeGit(okScenario(['docs/A.md']));
  const r = makeWipSnapshot(io)('C:/w/Membrana-x', ['docs/A.md']);
  assert.equal(r.commitSha, 'commit-abc');
  assert.equal(r.parentSha, 'head-before');
  assert.equal(r.headRef, 'feat/x');
  assert.deepEqual(r.committedPaths, ['docs/A.md']);
  assert.equal(r.createdAt, '2026-08-06T10:30:00+03:00');
  assert.equal(undoCommandFor(r), 'git -C C:/w/Membrana-x reset --soft head-before');
});

test('HEAD не сдвинулся — снимок несостоявшийся, а не «пустой успех»', () => {
  const io = fakeGit({ heads: ['same', 'same'], parent: 'x', committed: [] });
  assert.throws(
    () => makeWipSnapshot(io)('C:/w/x', ['docs/A.md']),
    (e) => e.code === E_SNAPSHOT_NOT_TAKEN && /HEAD не сдвинулся/.test(e.message),
  );
});

test('родитель ≠ прежний HEAD — снимок сел не туда, квитанция не выдаётся', () => {
  const io = fakeGit({ heads: ['head-before', 'commit-abc'], parent: 'чужой-родитель', committed: ['docs/A.md'] });
  assert.throws(
    () => makeWipSnapshot(io)('C:/w/x', ['docs/A.md']),
    (e) => e.code === E_SNAPSHOT_NOT_TAKEN && /сел не туда/.test(e.message),
  );
});

test('в индекс попало сверх списка — отказ ДО коммита, мутации нет (#1864 дефект 1)', () => {
  // Класс прогона 11.08: план нёс каталог, add раскрыл его содержимое.
  const io = fakeGit({ ...okScenario(['docs/A.md']), staged: ['docs/A.md', 'docs/archive/2026-08-11/audit.md'] });
  assert.throws(
    () => makeWipSnapshot(io)('C:/w/x', ['docs/A.md']),
    (e) => e.code === E_SNAPSHOT_NOT_TAKEN && /сверх списка/.test(e.message) && /не создавался/.test(e.message),
  );
  const verbs = io.calls.map((c) => c.args[0]);
  assert.ok(!verbs.includes('commit'), 'коммит не должен создаваться при расширенном охвате');
  const reset = io.calls.find((c) => c.args[0] === 'reset');
  assert.deepEqual(reset.args, ['reset', '--', 'docs/A.md'], 'с индекса снимаются ТОЛЬКО переданные пути');
});

test('пост-проверка коммита остаётся инвариантом: чистый индекс, но расширенный коммит — отказ', () => {
  const io = fakeGit({ ...okScenario(['docs/A.md', 'чужая/работа.mjs']), staged: ['docs/A.md'] });
  assert.throws(
    () => makeWipSnapshot(io)('C:/w/x', ['docs/A.md']),
    (e) => e.code === E_SNAPSHOT_NOT_TAKEN && /в коммит попало сверх списка/.test(e.message),
  );
});

test('коммит уже списка — не ошибка: git не пишет неизменённые файлы', () => {
  const io = fakeGit(okScenario(['docs/A.md']));
  const r = makeWipSnapshot(io)('C:/w/x', ['docs/A.md', 'docs/B.md']);
  assert.deepEqual(r.committedPaths, ['docs/A.md']);
});

test('валидация идёт ДО git: на негодных путях ни одного вызова', () => {
  const io = fakeGit(okScenario([]));
  assert.throws(() => makeWipSnapshot(io)('C:/w/x', ['-A']), (e) => e.code === E_SNAPSHOT_PATHS_INVALID);
  assert.equal(io.calls.length, 0, 'git не должен быть тронут, если список путей негоден');
});
