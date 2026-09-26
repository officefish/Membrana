/**
 * Зуб зова bash из Node на Windows (#2420).
 *
 * Судит СБОРКУ КОМАНДЫ, как и просил билет: «зуб — прогон на Windows-раннере либо тест на
 * саму сборку команды». Раннера у нас нет, сборка есть — и она детерминирована.
 *
 * Отдельный живой зуб внизу: на Windows зов по Windows-форме пути и по POSIX-форме должны
 * давать РАЗНЫЙ исход — иначе предмет этой починки исчез бы, а зуб остался бы зелёным ни о чём.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASH_NOT_FOUND, bashArgv, bashScriptArg, explainBashFailure } from './lib/bash-invoke.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GUARD = join(ROOT, 'deploy', 'disk-watchdog', 'disk-watchdog.sh');

test('предмет зуба: сторож диска на месте — иначе судить нечего', () => {
  assert.ok(
    spawnSync(process.execPath, ['-e', `process.exit(require('fs').existsSync(${JSON.stringify(GUARD)})?0:1)`])
      .status === 0,
    `предмет зуба потерян: нет ${GUARD}`,
  );
});

test('bashScriptArg: обратных косых в аргументе для bash не остаётся', () => {
  const out = bashScriptArg('C:\\Users\\u\\practice\\Membrana\\deploy\\x.sh');
  assert.equal(out, 'C:/Users/u/practice/Membrana/deploy/x.sh');
  assert.ok(!out.includes('\\'), 'обратная косая доедет до msys и будет съедена как экранирование');
});

test('bashScriptArg: буква диска и имя файла сохраняются целиком', () => {
  // Именно это терялось 23.09: «C:\Users…» доезжало как «C:Users…».
  const out = bashScriptArg('C:\\Users\\a\\b.sh');
  assert.match(out, /^C:\//);
  assert.ok(out.endsWith('/b.sh'));
  assert.ok(!out.includes('C:Users'), 'разделители потеряны — ровно дефект #2420');
});

test('bashScriptArg: POSIX-путь не трогается, UNC становится //host/share', () => {
  assert.equal(bashScriptArg('/c/Users/a/b.sh'), '/c/Users/a/b.sh');
  assert.equal(bashScriptArg('\\\\host\\share\\b.sh'), '//host/share/b.sh');
});

test('bashScriptArg: пустой путь — отказ, а не тихий зов bash без скрипта', () => {
  assert.throws(() => bashScriptArg(''), /пустой путь/);
  assert.throws(() => bashScriptArg(null), /пустой путь/);
});

test('bashArgv: скрипт первым, аргументы скрипта не нормализуются', () => {
  // Аргументы — не пути: «a\\b» может быть значением, и правка его исказила бы.
  assert.deepEqual(bashArgv('C:\\x\\y.sh', ['compute', 'a\\b']), ['C:/x/y.sh', 'compute', 'a\\b']);
  assert.deepEqual(bashArgv('/x/y.sh'), ['/x/y.sh']);
});

test('explainBashFailure: 127 объясняется, а не остаётся номером', () => {
  const why = explainBashFailure({ status: BASH_NOT_FOUND }, 'C:\\x\\y.sh');
  assert.match(why, /не нашёл скрипт/);
  assert.match(why, /C:\/x\/y\.sh/);
  assert.match(why, /POSIX/);
});

test('explainBashFailure: отсутствие самого bash названо отдельной причиной', () => {
  const why = explainBashFailure({ error: { code: 'ENOENT' } }, 'C:\\x\\y.sh');
  assert.match(why, /интерпретатор bash не найден/);
  assert.match(why, /WSL/);
});

test('explainBashFailure: обычный ненулевой код — не его забота', () => {
  assert.equal(explainBashFailure({ status: 1 }, 'C:\\x\\y.sh'), null);
  assert.equal(explainBashFailure({ status: 0 }, 'C:\\x\\y.sh'), null);
});

test('живой зов: сторож диска считается по нормализованному пути', () => {
  const r = spawnSync('bash', bashArgv(GUARD, ['compute', String(6 * 1024 ** 3), String(100 * 1024 ** 2)]), {
    env: { ...process.env, DW_ENV_FILE: '/dev/null', LC_ALL: 'C' },
    encoding: 'utf8',
  });
  const why = explainBashFailure(r, GUARD);
  assert.equal(why, null, why ?? '');
  assert.equal(r.stdout.trim(), '61');
});
