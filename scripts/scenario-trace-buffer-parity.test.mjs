/**
 * Поведенческая половина зуба на предмет прибора (#2485).
 *
 * Прибор `scripts/lib/scenario-trace-teardown-measure.mjs` воспроизводит логику
 * `apps/client/src/modules/device-board/scenarioTraceBuffer.ts` КОПИЕЙ (класс
 * `ScenarioTraceProbe`). Копия молча разойдётся с оригиналом, и прибор начнёт мерить прошлое.
 * Здесь подлинный модуль ИМПОРТИРУЕТСЯ и сверяется с копией по поведению: формовка строки,
 * потолок кольца, вытеснение, склейка текста, семантика снапшота.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ. Импорт `.ts` требует стирания типов (Node ≥ 22), а `yarn
 * test:scripts` идёт в CI на Node 20 и на `.ts` падает с ERR_UNKNOWN_FILE_EXTENSION. Поэтому
 * файл исключён из каталога `tests/test-scripts.catalog.json` с причиной и гоняется отдельным
 * шагом `unit-tests.yml`, где Node 22 уже поднят. Переносимая половина, которой загрузчик не
 * нужен, живёт в `scripts/scenario-trace-teardown-measure.test.mjs` и идёт везде.
 *
 * Запуск руками: node --experimental-strip-types --test scripts/scenario-trace-buffer-parity.test.mjs
 */
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  PROBE_MODELLED_EXPORTS,
  PROBE_UNMODELLED_EXPORTS,
  ScenarioTraceProbe,
  readMaxTraceLines,
  scenarioTraceBufferSourcePath,
} from './lib/scenario-trace-teardown-measure.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const real = await import(pathToFileURL(scenarioTraceBufferSourcePath(REPO_ROOT)).href);

test('parity: наблюдаемый потолок кольца совпадает с прочитанным из текста', () => {
  const declared = readMaxTraceLines(REPO_ROOT);

  real.clearScenarioTraceBuffer();
  for (let i = 0; i < declared + 25; i += 1) {
    real.appendScenarioTraceLine('tick', { tick: i });
  }
  const observed = real.getScenarioTraceLineCount();
  real.clearScenarioTraceBuffer();

  assert.equal(observed, declared, 'MAX_TRACE_LINES из текста не совпал с наблюдаемым потолком');
  assert.equal(new ScenarioTraceProbe().maxLines, declared, 'умолчание прибора отстало от модуля');
});

test('parity: копия формует строку байт в байт как продуктовый модуль', () => {
  const probe = new ScenarioTraceProbe();
  const cases = [
    ['no ctx', undefined],
    ['empty ctx', {}],
    ['string', { runId: 'abc' }],
    ['null', { nodeId: null }],
    ['mixed', { runId: 'r', tick: 7, branch: 'main', ok: true, ratio: 0.5 }],
  ];

  for (const [message, context] of cases) {
    assert.equal(
      probe.formatScenarioTraceLine(message, context),
      real.formatScenarioTraceLine(message, context),
      `формовка разошлась на «${message}»`,
    );
  }
});

test('parity: вытеснение и склейка текста совпадают на переполненном кольце', () => {
  const cap = readMaxTraceLines(REPO_ROOT);
  const probe = new ScenarioTraceProbe({ maxLines: cap });

  real.clearScenarioTraceBuffer();
  for (let i = 0; i < cap + 137; i += 1) {
    real.appendScenarioTraceLine('[device-board] main-tick-done', { tick: i, nodeId: `node-${i % 37}` });
    probe.appendScenarioTraceLine('[device-board] main-tick-done', { tick: i, nodeId: `node-${i % 37}` });
  }

  const realText = real.getScenarioTraceText();
  const probeText = probe.getScenarioTraceText();
  real.clearScenarioTraceBuffer();

  assert.equal(probe.getScenarioTraceLines().length, cap);
  assert.equal(probeText, realText, 'текст копии разошёлся с текстом модуля');
  assert.equal(Buffer.byteLength(probeText, 'utf8'), Buffer.byteLength(realText, 'utf8'));
});

test('parity: снапшот держит ссылку между мутациями у копии и у модуля одинаково', () => {
  const probe = new ScenarioTraceProbe();
  real.clearScenarioTraceBuffer();

  real.appendScenarioTraceLine('a');
  probe.appendScenarioTraceLine('a');
  const realFirst = real.getScenarioTraceLines();
  const probeFirst = probe.getScenarioTraceLines();

  assert.equal(real.getScenarioTraceLines(), realFirst, 'модуль пересобрал снапшот без мутации');
  assert.equal(probe.getScenarioTraceLines(), probeFirst, 'копия пересобрала снапшот без мутации');

  real.appendScenarioTraceLine('b');
  probe.appendScenarioTraceLine('b');

  assert.notEqual(real.getScenarioTraceLines(), realFirst);
  assert.notEqual(probe.getScenarioTraceLines(), probeFirst);
  real.clearScenarioTraceBuffer();
});

test('parity: живая поверхность экспортов совпадает с объявленной прибором', () => {
  const declared = new Set([...PROBE_MODELLED_EXPORTS, ...Object.keys(PROBE_UNMODELLED_EXPORTS)]);
  const unknown = Object.keys(real).filter((name) => !declared.has(name));

  assert.deepEqual(
    unknown,
    [],
    `scenarioTraceBuffer вырос на ${unknown.join(', ')} — решите, воспроизводит прибор это или нет`,
  );

  for (const name of PROBE_MODELLED_EXPORTS) {
    assert.equal(typeof real[name], 'function', `модуль потерял ${name}`);
    assert.equal(typeof new ScenarioTraceProbe()[name], 'function', `прибор не воспроизводит ${name}`);
  }
});
