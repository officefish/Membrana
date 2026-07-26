import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyGateOutcome,
  parseCiGitleaksVersion,
  parseGateArgs,
  parseLocalGitleaksVersion,
  rangeScanArgs,
  versionParity,
} from './secret-gate-push.mjs';

test('rangeScanArgs: тот же detect, что в CI, но по диапазону — объём не растёт с историей', () => {
  const args = rangeScanArgs();
  assert.equal(args[0], 'detect', 'protect --staged смотрит только индекс — это и было расхождение');
  assert.ok(args.includes('--log-opts=origin/main..HEAD'));
  assert.ok(args.includes('--redact'), 'вывод не должен печатать значения');
  // Правила и baseline берутся из репозитория: дублировать их здесь — значит развести
  // локальный набор с CI, то есть воспроизвести исходную болезнь.
  assert.ok(!args.some((a) => a.startsWith('--config')));
  assert.ok(!args.some((a) => a.includes('gitleaksignore')));
});

test('rangeScanArgs: база настраиваемая', () => {
  assert.ok(rangeScanArgs({ base: 'origin/dev' }).includes('--log-opts=origin/dev..HEAD'));
});

test('parseGateArgs: --base без значения — явная ошибка', () => {
  assert.equal(parseGateArgs([]).base, 'origin/main');
  assert.equal(parseGateArgs(['--base', 'origin/dev']).base, 'origin/dev');
  assert.throws(() => parseGateArgs(['--base']), /требует значение/);
});

test('classifyGateOutcome: находки блокируют, отсутствие инструмента — нет', () => {
  assert.deepEqual(classifyGateOutcome({ code: 1 }), { exitCode: 1, reason: 'leaks' });
  assert.deepEqual(classifyGateOutcome({ code: 0 }), { exitCode: 0, reason: 'ok' });
  // Мягко: иначе агент без gitleaks начнёт обходить гейт через SKIP, и он умрёт совсем.
  assert.deepEqual(classifyGateOutcome({ toolMissing: true }), { exitCode: 0, reason: 'tool-missing' });
  assert.deepEqual(classifyGateOutcome({ baseMissing: true }), { exitCode: 0, reason: 'base-missing' });
  // Неизвестный код (например, сам gitleaks упал) не превращаем в «утечка есть».
  assert.deepEqual(classifyGateOutcome({ code: 2 }), { exitCode: 0, reason: 'unknown' });
});

test('приоритет: отсутствующий инструмент важнее кода возврата', () => {
  assert.equal(classifyGateOutcome({ toolMissing: true, code: 1 }).exitCode, 0);
});

// --- Второй слой паритета: ВЕРСИЯ --------------------------------------------------------
// Найдено проверкой гейта падением: локальный 8.30.1 не считает находкой синтетический
// PEM, пришпиленный в CI 8.21.2 — считает. Одного объёма скана недостаточно.

test('parseCiGitleaksVersion: версия читается из самого workflow, а не дублируется', () => {
  const yml = 'env:\n  GITLEAKS_VERSION: 8.21.2\n';
  assert.equal(parseCiGitleaksVersion(yml), '8.21.2');
  assert.equal(parseCiGitleaksVersion('нет пина'), null);
  assert.equal(parseCiGitleaksVersion(null), null);
});

test('parseLocalGitleaksVersion: берёт версию из вывода бинаря', () => {
  assert.equal(parseLocalGitleaksVersion('8.30.1\n'), '8.30.1');
  assert.equal(parseLocalGitleaksVersion('gitleaks version 8.21.2'), '8.21.2');
  assert.equal(parseLocalGitleaksVersion(''), null);
});

test('versionParity: расхождение названо прямо, совпадение молчит', () => {
  const drift = versionParity({ local: '8.30.1', ci: '8.21.2' });
  assert.equal(drift.ok, false);
  assert.match(drift.note, /8\.30\.1/);
  assert.match(drift.note, /8\.21\.2/);
  assert.match(drift.note, /не гарантирует/, 'формулировка должна снимать ложное «зелёно»');

  assert.deepEqual(versionParity({ local: '8.21.2', ci: '8.21.2' }), { ok: true, note: null });
});

test('versionParity: неизвестная версия не даёт ложной тревоги', () => {
  assert.equal(versionParity({ local: null, ci: '8.21.2' }).ok, true);
  assert.equal(versionParity({ local: '8.30.1', ci: null }).ok, true);
  assert.equal(versionParity({}).ok, true);
});
