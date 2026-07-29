/**
 * Зуб зуба (#1449): освобождение по ADR не должно превращаться в глушилку.
 *
 * Вещдок 29.07: `deepseek.service.ts` метился как дефект, хотя прямой путь этого
 * канала ратифицирован ADR-0007 — «починка» сломала бы решение, а не грабли.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { scanFetchZones } from './tooth.mjs';

const ZONE = 'packages/background-office/src/modules';

/** Мини-дерево: файлы зоны + docs/adr, чтобы освобождение было чем проверить. */
function sandbox(files, adrFiles = []) {
  const root = mkdtempSync(join(tmpdir(), 'network-tooth-'));
  for (const [rel, src] of Object.entries(files)) {
    const abs = join(root, ZONE, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, src, 'utf8');
  }
  if (adrFiles.length) {
    mkdirSync(join(root, 'docs', 'adr'), { recursive: true });
    for (const name of adrFiles) writeFileSync(join(root, 'docs', 'adr', name), '# adr\n', 'utf8');
  }
  return root;
}

function withSandbox(files, adrFiles, fn) {
  const root = sandbox(files, adrFiles);
  try {
    fn(scanFetchZones(root, [ZONE]));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('голый fetch без прикрытия — находка', () => {
  withSandbox({ 'a/a.service.ts': 'await fetch("https://x/y");\n' }, [], (res) => {
    assert.deepEqual(res.bare, [`${ZONE}/a/a.service.ts`]);
    assert.deepEqual(res.exempt, []);
  });
});

test('ВЕЩДОК: прямой путь по живому ADR — освобождение, а не находка', () => {
  withSandbox(
    {
      'deepseek/deepseek.service.ts':
        '// network-tooth:allow-bare-fetch ADR-0007\nawait fetch(DEEPSEEK_URL);\n',
    },
    ['ADR-0007-night-narrative-provider-chain.md'],
    (res) => {
      assert.deepEqual(res.bare, []);
      assert.deepEqual(res.exempt, [
        { file: `${ZONE}/deepseek/deepseek.service.ts`, adr: 'ADR-0007' },
      ]);
    },
  );
});

test('метка на несуществующий ADR не освобождает — иначе это глушилка', () => {
  withSandbox(
    { 'b/b.service.ts': '// network-tooth:allow-bare-fetch ADR-9999\nawait fetch("https://x");\n' },
    ['ADR-0007-night-narrative-provider-chain.md'],
    (res) => {
      assert.equal(res.exempt.length, 0);
      assert.equal(res.bare.length, 1);
      assert.match(res.bare[0], /ADR-9999, которого нет/u);
    },
  );
});

test('вызов через общий proxy-aware хелпер прикрыт', () => {
  withSandbox(
    {
      'c/c.service.ts':
        "import { proxyAwareFetch } from '../../lib/proxy-fetch';\nawait proxyAwareFetch(url, {}, proxy);\n",
    },
    [],
    (res) => {
      assert.deepEqual(res.bare, []);
      assert.deepEqual(res.exempt, []);
    },
  );
});

test('ProxyAgent прямо в файле по-прежнему прикрывает', () => {
  withSandbox(
    { 'd/d.service.ts': "import { ProxyAgent } from 'undici';\nawait fetch(u, { dispatcher });\n" },
    [],
    (res) => {
      assert.deepEqual(res.bare, []);
    },
  );
});

test('нумерация ADR без префикса (docs/adr/0006-*.md) тоже считается живой', () => {
  withSandbox(
    { 'e/e.service.ts': '// network-tooth:allow-bare-fetch ADR-0006\nawait fetch(u);\n' },
    ['0006-benchmark-runs-calibrated-preset.md'],
    (res) => {
      assert.deepEqual(res.bare, []);
      assert.equal(res.exempt[0].adr, 'ADR-0006');
    },
  );
});
