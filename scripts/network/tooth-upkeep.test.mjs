/**
 * Зуб 1 к #2495: уход за снимком не роняет отправку ПОСТОРОННЕГО изменения.
 *
 * ВЕЩДОК 27.09. Снимок сети обновлён вечерним ритуалом 25.09 в 13:34Z, 48 часов истекли
 * 27.09 в 13:34Z. В 14:07Z из дерева на ветке PR #2489 — правка, не касающаяся
 * docs/network/ вовсе — `node scripts/network/tooth.mjs` дал находку и exit 1, и push
 * стал невозможен. Отказ приходил ВСЕМ деревьям сразу и ни от чьей правки не зависел:
 * снимок лежит в репозитории и протухает по календарю.
 *
 * Что здесь утверждается:
 *   · календарь и mtime витрины в режиме `warn` — предупреждение, а не находка;
 *   · режим `warn` НЕ глушилка: словарь, голый fetch, отсутствующий и нечитаемый снимок
 *     остаются находками в любом режиме;
 *   · по умолчанию (прямой прогон, ритуал, разбор) уход судится жёстко — как и был.
 */
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { collect, parseArgs, SNAPSHOT_UPKEEP_MODES } from './tooth.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NOW = '2026-09-27T14:07:00.000Z';
const STALE_AT = '2026-09-25T13:34:16.022Z'; // вещдок: снимок ритуала 25.09
const FRESH_AT = '2026-09-27T09:00:00.000Z';

/**
 * Мини-дерево с настоящим словарём исходов (копия из репозитория — чтобы «словарь
 * закрыт» проверялось на том же файле, что в бою) и снимком заданной давности.
 */
function sandbox({ generatedAt = FRESH_AT, mdBehind = false, snapshotBody = null, yml = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'network-tooth-upkeep-'));
  const home = join(root, 'docs', 'network');
  mkdirSync(home, { recursive: true });
  if (yml === null) copyFileSync(join(repoRoot, 'docs', 'network', 'outcomes.yml'), join(home, 'outcomes.yml'));
  else writeFileSync(join(home, 'outcomes.yml'), yml, 'utf8');

  if (snapshotBody !== false) {
    const json = join(home, 'env.snapshot.json');
    writeFileSync(json, snapshotBody ?? JSON.stringify({ generatedAt, probes: [], summary: {} }), 'utf8');
    const md = join(home, 'env.snapshot.md');
    writeFileSync(md, '# снимок\n', 'utf8');
    // mtime задаётся явно: «витрина отстала» — про отношение времён файлов, а не про
    // скорость машины, поэтому ждать секунду в тесте незачем.
    const base = 1_700_000_000;
    utimesSync(json, base, base);
    utimesSync(md, base + (mdBehind ? -60 : 60), base + (mdBehind ? -60 : 60));
  }
  return root;
}

function withSandbox(opts, fn) {
  const root = sandbox(opts);
  try {
    fn((mode) => collect({ root, now: NOW, snapshotUpkeep: mode }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('ВЕЩДОК 27.09: снимок старше 48 ч в режиме warn не даёт ни одной находки', () => {
  withSandbox({ generatedAt: STALE_AT }, (run) => {
    const res = run('warn');
    assert.deepEqual(res.findings, [], 'push постороннего изменения не задерживается');
    assert.equal(res.warnings.length, 1);
    assert.match(res.warnings[0], /старше 48 ч/u, 'протухание названо вслух, а не проглочено');
    assert.match(res.warnings[0], new RegExp(STALE_AT.replace(/[.]/gu, '\\.'), 'u'), 'названа дата снимка');
  });
});

test('по умолчанию (ритуал, прямой прогон, разбор) протухание — находка, как и было', () => {
  withSandbox({ generatedAt: STALE_AT }, (run) => {
    const res = run(undefined);
    assert.equal(res.warnings.length, 0);
    assert.equal(res.findings.length, 1);
    assert.match(res.findings[0], /старше 48 ч/u);
  });
});

test('режим warn НЕ глушилка: разошедшийся словарь остаётся находкой', () => {
  const broken = ['outcomes:', '  - id: nonsense_outcome', 'transport:', '  - dns_fail'].join('\n');
  withSandbox({ generatedAt: STALE_AT, yml: broken }, (run) => {
    const res = run('warn');
    assert.ok(
      res.findings.some((f) => /словарь не знает исходов из кода/u.test(f)),
      'находка, вызванная изменением, краснеет и в предпушевом режиме',
    );
    assert.ok(
      res.warnings.some((w) => /старше 48 ч/u.test(w)),
      'календарь при этом остаётся предупреждением — классы не смешиваются',
    );
  });
});

test('отсутствующий снимок — находка в ЛЮБОМ режиме: это не календарь, а пропажа', () => {
  withSandbox({ snapshotBody: false }, (run) => {
    for (const mode of SNAPSHOT_UPKEEP_MODES) {
      const res = run(mode);
      assert.ok(
        res.findings.some((f) => /нет снимка/u.test(f)),
        `снимка нет → находка (режим ${mode})`,
      );
    }
  });
});

test('нечитаемый снимок — находка в ЛЮБОМ режиме (сломанное содержание, не давность)', () => {
  withSandbox({ snapshotBody: '{ не json' }, (run) => {
    for (const mode of SNAPSHOT_UPKEEP_MODES) {
      const res = run(mode);
      assert.ok(
        res.findings.some((f) => /не читается/u.test(f)),
        `битый json → находка (режим ${mode})`,
      );
    }
  });
});

test('витрина отстала от json — тот же класс ухода: warn предупреждает, default краснеет', () => {
  withSandbox({ generatedAt: FRESH_AT, mdBehind: true }, (run) => {
    const warn = run('warn');
    assert.deepEqual(warn.findings, [], 'отставшая витрина не роняет чужой push');
    assert.ok(warn.warnings.some((w) => /витрина/u.test(w)));

    const strict = run('finding');
    assert.ok(strict.findings.some((f) => /витрина/u.test(f)), 'там, где снимок предмет, это находка');
  });
});

test('свежий снимок и целая витрина — ни находок, ни предупреждений', () => {
  withSandbox({ generatedAt: FRESH_AT }, (run) => {
    for (const mode of SNAPSHOT_UPKEEP_MODES) {
      const res = run(mode);
      assert.deepEqual(res.findings, [], `режим ${mode}`);
      assert.deepEqual(res.warnings, [], `режим ${mode}`);
    }
  });
});

test('ключ: умолчание строгое, значение опечатки — инструментальная ошибка, не тихий режим', () => {
  assert.equal(parseArgs([]).snapshotUpkeep, 'finding', 'без ключа зуб судит жёстко');
  assert.equal(parseArgs(['--snapshot-upkeep=warn']).snapshotUpkeep, 'warn');
  assert.equal(parseArgs(['--snapshot-upkeep=finding']).snapshotUpkeep, 'finding');
  assert.throws(() => parseArgs(['--snapshot-upkeep=warning']), /принимает finding\|warn/u);
  assert.throws(() => parseArgs(['--skip-network-tooth']), /неизвестный аргумент/u);
});
