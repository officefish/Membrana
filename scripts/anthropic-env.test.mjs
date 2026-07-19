import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { loadDotEnv, resolveDotEnvPath, resolveDotEnvPaths } from './_anthropic-env.mjs';

/**
 * Sibling-раскладка НАСТОЯЩИМ git worktree (#567): practice/Membrana — корень,
 * practice/Membrana-openrouter — сосед. Вверх от соседа корневой .env не найти.
 */
function makeSiblingLayout() {
  const practice = mkdtempSync(join(tmpdir(), 'membrana-env-sibling-'));
  const root = join(practice, 'Membrana');
  const sibling = join(practice, 'Membrana-openrouter');
  mkdirSync(root, { recursive: true });
  const git = (args, cwd = root) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git(['init', '-q']);
  git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init']);
  git(['worktree', 'add', '-q', sibling]);
  return { practice, root, sibling };
}

function withEnv(name, value, fn) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

test('loadDotEnv discovers the repository .env from an isolated worktree', () => {
  const root = mkdtempSync(join(tmpdir(), 'membrana-env-root-'));
  const worktree = join(root, '.worktrees', 'issue-178-reconcile');
  mkdirSync(worktree, { recursive: true });
  writeFileSync(join(root, '.env'), 'ANTHROPIC_API_KEY=from-root\n', 'utf8');

  withEnv('MEMBRANA_ENV_PATH', undefined, () => {
    withEnv('ANTHROPIC_API_KEY', undefined, () => {
      assert.equal(resolveDotEnvPath(worktree), join(root, '.env'));
      loadDotEnv(worktree);
      assert.equal(process.env.ANTHROPIC_API_KEY, 'from-root');
    });
  });
});

test('sibling-worktree видит ключи корневого .env (регресс 401 «Invalid token» 16.07)', () => {
  const { root, sibling } = makeSiblingLayout();
  writeFileSync(join(root, '.env'), 'ROOT_ONLY_KEY=from-root\nSHARED_KEY=root\n', 'utf8');
  writeFileSync(join(sibling, '.env'), 'SHARED_KEY=local\n', 'utf8');

  withEnv('MEMBRANA_ENV_PATH', undefined, () => {
    withEnv('ROOT_ONLY_KEY', undefined, () => {
      withEnv('SHARED_KEY', undefined, () => {
        loadDotEnv(sibling);
        // Корень закрывает дыру локального .env…
        assert.equal(process.env.ROOT_ONLY_KEY, 'from-root');
        // …но локальный поверх: переопределения worktree живут.
        assert.equal(process.env.SHARED_KEY, 'local');
      });
    });
  });
});

test('sibling-worktree без локального .env: корневой в цепочке загрузки', () => {
  const { root, sibling } = makeSiblingLayout();
  writeFileSync(join(root, '.env'), 'ROOT_ONLY_KEY_2=from-root\n', 'utf8');

  withEnv('MEMBRANA_ENV_PATH', undefined, () => {
    withEnv('ROOT_ONLY_KEY_2', undefined, () => {
      // Точный состав цепочки зависит от ambient .env выше tmpdir (поиск вверх —
      // штатное старое поведение), поэтому проверяем ВКЛЮЧЕНИЕ корня и эффект.
      // Сравнение по realpath: tmpdir отдаёт 8.3-короткий путь, git — длинный.
      const canon = (p) => realpathSync.native(p);
      assert.ok(resolveDotEnvPaths(sibling).map(canon).includes(canon(join(root, '.env'))));
      loadDotEnv(sibling);
      assert.equal(process.env.ROOT_ONLY_KEY_2, 'from-root');
    });
  });
});

test('вне git-репозитория поведение прежнее: поиск вверх, без падений', () => {
  const dir = mkdtempSync(join(tmpdir(), 'membrana-env-nogit-'));
  const nested = join(dir, 'a', 'b');
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(dir, '.env'), 'X=1\n', 'utf8');
  withEnv('MEMBRANA_ENV_PATH', undefined, () => {
    assert.equal(resolveDotEnvPath(nested), join(dir, '.env'));
  });
});

test('MEMBRANA_ENV_PATH takes precedence over upward .env discovery', () => {
  const root = mkdtempSync(join(tmpdir(), 'membrana-env-explicit-'));
  const worktree = join(root, '.worktrees', 'sprint');
  const external = join(root, 'secrets', 'agent.env');
  mkdirSync(worktree, { recursive: true });
  mkdirSync(join(root, 'secrets'), { recursive: true });
  writeFileSync(join(root, '.env'), 'ANTHROPIC_API_KEY=from-root\n', 'utf8');
  writeFileSync(external, 'ANTHROPIC_API_KEY=from-explicit\n', 'utf8');

  withEnv('MEMBRANA_ENV_PATH', external, () => {
    withEnv('ANTHROPIC_API_KEY', undefined, () => {
      assert.equal(resolveDotEnvPath(worktree), external);
      loadDotEnv(worktree);
      assert.equal(process.env.ANTHROPIC_API_KEY, 'from-explicit');
    });
  });
});
