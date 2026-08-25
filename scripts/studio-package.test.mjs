// Зуб #2147/№5: один stderr — три причины, три лекарства (вещдоки 21.08 и 25.08).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyPackageFailure,
  packageFailureAdvice,
} from './lib/studio-package-failure.mjs';

// Живой stderr Г, 25.08 (чистый каталог, AV): и ведущей, 21.08 (остаток).
const DENIED_OUTPUT =
  '⨯ open C:\\…\\release\\win-unpacked\\d3dcompiler_47.dll: Access is denied  ERR_ELECTRON_BUILDER_CANNOT_EXECUTE';

test('#2147/5 остаток прерванной сборки (21.08): каталог был ДО запуска → лекарство «удалить», не AV', () => {
  const c = classifyPackageFailure({ output: DENIED_OUTPUT, leftoverExistedBeforeRun: true, studioProcessRunning: false });
  assert.equal(c.kind, 'leftover');
  assert.match(c.file ?? '', /d3dcompiler_47\.dll/);
  const advice = packageFailureAdvice(c).join('\n');
  assert.match(advice, /удалить .*win-unpacked/i);
  assert.doesNotMatch(advice, /исключение AV/);
});

test('#2147/5 чистый каталог + Studio запущена → «закрой приложение»', () => {
  const c = classifyPackageFailure({ output: DENIED_OUTPUT, leftoverExistedBeforeRun: false, studioProcessRunning: true });
  assert.equal(c.kind, 'app-running');
  assert.match(packageFailureAdvice(c).join('\n'), /закрыть приложение/i);
});

test('#2147/5 чистый каталог, приложения нет (Г, 25.08) → внешний держатель: AV + повтор + артефакт CI', () => {
  const c = classifyPackageFailure({ output: DENIED_OUTPUT, leftoverExistedBeforeRun: false, studioProcessRunning: false });
  assert.equal(c.kind, 'external-holder');
  const advice = packageFailureAdvice(c).join('\n');
  assert.match(advice, /исключение AV/i);
  assert.match(advice, /gh run download/);
  assert.match(advice, /d3dcompiler_47\.dll/);
});

test('#2147/5 не-denied падение → unknown, лекарств не сочиняем', () => {
  const c = classifyPackageFailure({ output: 'Error: Cannot find module x', leftoverExistedBeforeRun: false, studioProcessRunning: false });
  assert.equal(c.kind, 'unknown');
  assert.equal(c.file, null);
  assert.match(packageFailureAdvice(c).join('\n'), /не классифицировано/);
});

// ── #2147/5, вещдок Г 25.08 (после #2159): дереды обязаны включать замыкание клиента ──
import { DEPS_BUILD_FILTERS, depsBuildArgs } from './lib/studio-package-plan.mjs';

test('#2147/5 дереды: замыкание @membrana/client... обязательно (telemetry-journal-service — зависимость клиента, не Studio)', () => {
  assert.ok(DEPS_BUILD_FILTERS.includes('@membrana/client...'), 'без замыкания клиента dist его зависимостей протухает по содержимому (Г, 25.08)');
  assert.ok(DEPS_BUILD_FILTERS.includes('@membrana/membrana-studio...'));
  const args = depsBuildArgs();
  assert.deepEqual(args.slice(0, 3), ['turbo', 'run', 'build']);
  assert.ok(args.includes('--filter=@membrana/client...'));
});
