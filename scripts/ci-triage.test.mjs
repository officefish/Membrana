/**
 * Зуб разбора красного CI (#1493 Ф4).
 *
 * ВЕЩДОК 30.07 (PR #1487): упали два теста детекторов с
 * `does not provide an export named 'fuseDetectorConfidences'`, а дифф трогал только
 * консилиум. Ручной разбор занял четыре шага; перезапуск дал зелёное на том же коммите.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  TRIAGE_STATES,
  extractFailureTargets,
  moduleStem,
  renderTriage,
  triage,
} from './lib/ci-red-triage.mjs';

/** Фрагмент лога 30.07, сокращённый до значимых строк. */
const LOG_1487 = `
Lint, typecheck, test, build	Script ritual tests (test:scripts)	not ok 550 - golden combinedScore детерминирован и в [0..1]
  error: "The requested module './detection-fusion.js' does not provide an export named 'fuseDetectorConfidences'"
  name: 'SyntaxError'
  file: scripts/drift-anchor-behavioral.test.mjs
# fail 2
`;

test('из лога вынимаются и файлы, и модуль из ошибки резолва', () => {
  const t = extractFailureTargets(LOG_1487);
  assert.ok(t.files.includes('scripts/drift-anchor-behavioral.test.mjs'));
  assert.ok(t.modules.includes('./detection-fusion.js'), 'модуль назвал причину, а имя теста — нет');
});

test('ВЕЩДОК #1487: дифф по консилиуму — исход «вне диффа», а не «моё»', () => {
  const t = extractFailureTargets(LOG_1487);
  const v = triage({
    failureFiles: t.files,
    failureModules: t.modules,
    diffFiles: [
      'scripts/consilium.mjs',
      'scripts/lib/consilium-input-manifest.mjs',
      'scripts/consilium-input-manifest.test.mjs',
    ],
  });
  assert.equal(v.state, 'вне диффа');
  assert.match(v.advice, /rerun --failed/u);
});

test('тот же лог, но дифф трогает упавший файл — «моё»', () => {
  const t = extractFailureTargets(LOG_1487);
  const v = triage({
    failureFiles: t.files,
    failureModules: t.modules,
    diffFiles: ['scripts/drift-anchor-behavioral.test.mjs'],
  });
  assert.equal(v.state, 'моё');
  assert.deepEqual(v.overlapFiles, ['scripts/drift-anchor-behavioral.test.mjs']);
});

test('пересечение по МОДУЛЮ ловится, когда имя файла в логе другое', () => {
  const v = triage({
    failureFiles: [],
    failureModules: ['./detection-fusion.js'],
    diffFiles: ['packages/core/src/contracts/detection-fusion.ts'],
  });
  assert.equal(v.state, 'моё');
  assert.deepEqual(v.overlapModules, ['./detection-fusion.js']);
});

test('пустой лог — «не опознано», а не «вне диффа»', () => {
  // Молчаливое «вне диффа» на пустом логе отправило бы гонять rerun вслепую.
  const v = triage({ failureFiles: [], failureModules: [], diffFiles: ['a.ts'] });
  assert.equal(v.state, 'не опознано');
  assert.match(v.advice, /глазами/u);
});

test('основа имени модуля отбрасывает расширение и путь', () => {
  assert.equal(moduleStem('./detection-fusion.js'), 'detection-fusion');
  assert.equal(moduleStem('packages/core/src/contracts/detection-fusion.ts'), 'detection-fusion');
  assert.equal(moduleStem('@membrana/rag-service'), '@membrana/rag-service'.split('/').pop());
});

test('исходы — закрытый словарь', () => {
  const cases = [
    triage({ failureFiles: ['scripts/a.test.mjs'], failureModules: [], diffFiles: ['scripts/a.test.mjs'] }),
    triage({ failureFiles: ['scripts/a.test.mjs'], failureModules: [], diffFiles: ['scripts/b.mjs'] }),
    triage({ failureFiles: [], failureModules: [], diffFiles: [] }),
  ];
  for (const c of cases) assert.ok(TRIAGE_STATES.includes(c.state), `${c.state} вне словаря`);
});

test('отчёт называет вещдоки, а не только вердикт', () => {
  const t = extractFailureTargets(LOG_1487);
  const v = triage({ failureFiles: t.files, failureModules: t.modules, diffFiles: ['scripts/consilium.mjs'] });
  const out = renderTriage(v, { failureFiles: t.files, failureModules: t.modules }).join('\n');
  assert.match(out, /упавшие файлы/u);
  assert.match(out, /модули из ошибок/u);
  assert.match(out, /вне диффа/u);
});
