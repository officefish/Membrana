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
