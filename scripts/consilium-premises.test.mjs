import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PREMISES_HEADER,
  buildPremisesRepairPrompt,
  buildRerunNotice,
  insertPremisesSection,
  onlyMissingPremises,
} from './lib/consilium-premises.mjs';
import { meetingVerdictProblems } from './lib/protocol-validator.mjs';

import { MISSING_PREMISES_PROBLEM as MISSING } from './lib/protocol-validator.mjs';
const OTHER = 'в списке посылок есть ВЫВОД этой же комнаты (маркер «новое, здесь принятое») — …';

const PROTO_NO_PREMISES = [
  '# Консилиум: тест (E9)',
  '',
  '[Teamlead]: реплика.',
  '',
  '## Итоговое решение консилиума',
  '',
  '| Вопрос | Решение |',
  '|--------|---------|',
  '| X | Y |',
  '',
  '*Реплик в диалоге: 1; каждый участник высказался.*',
].join('\n');

const SNIPPET = [
  `${PREMISES_HEADER}`,
  '',
  '1. Вход А — **факт**.',
  '2. Вход Б — **норма**.',
].join('\n');

test('onlyMissingPremises: ровно один дефект отсутствия секции — и только он', () => {
  assert.equal(onlyMissingPremises([MISSING]), true);
  assert.equal(onlyMissingPremises([MISSING, OTHER]), false);
  assert.equal(onlyMissingPremises([OTHER]), false);
  assert.equal(onlyMissingPremises([]), false);
});

test('insertPremisesSection: секция встаёт перед футером реплик', () => {
  const merged = insertPremisesSection(PROTO_NO_PREMISES, SNIPPET);
  const premIdx = merged.indexOf(PREMISES_HEADER);
  const footIdx = merged.indexOf('*Реплик в диалоге:');
  assert.ok(premIdx > 0 && footIdx > premIdx, 'посылки до футера');
});

test('insertPremisesSection: без футера — секция в конец; гейт становится чист', () => {
  const noFooter = PROTO_NO_PREMISES.replace(/\*Реплик[\s\S]*$/u, '').trimEnd();
  assert.ok(meetingVerdictProblems(noFooter).length > 0, 'до вставки гейт красный');
  const merged = insertPremisesSection(noFooter, SNIPPET);
  assert.deepEqual(meetingVerdictProblems(merged), [], 'после вставки гейт чист');
});

test('insertPremisesSection: преамбула модели до заголовка срезается', () => {
  const noisy = `Конечно, вот секция:\n\n${SNIPPET}`;
  const merged = insertPremisesSection(PROTO_NO_PREMISES, noisy);
  assert.ok(!merged.includes('Конечно, вот секция'), 'преамбула не попала в протокол');
  assert.deepEqual(meetingVerdictProblems(merged), []);
});

test('insertPremisesSection: снипет без заголовка получает канонический заголовок', () => {
  const bare = '1. Вход А — **факт**.';
  const merged = insertPremisesSection(PROTO_NO_PREMISES, bare);
  assert.ok(merged.includes(PREMISES_HEADER));
  assert.deepEqual(meetingVerdictProblems(merged), []);
});

test('пустой/whitespace-снипет НЕ проходит гейт молча (секция без тела = дефект)', () => {
  for (const emptyish of ['', '   ', '\n\n']) {
    const merged = insertPremisesSection(PROTO_NO_PREMISES, emptyish);
    assert.ok(meetingVerdictProblems(merged).length > 0, `снипет ${JSON.stringify(emptyish)} не даёт зелёнку`);
  }
});

test('repair-промпт несёт точный заголовок гейта и запрет на выводы', () => {
  const p = buildPremisesRepairPrompt();
  assert.ok(p.includes(PREMISES_HEADER));
  assert.match(p, /факт/u);
  assert.match(p, /норма/u);
  assert.match(p, /выводы .*вносить нельзя/iu);
});

test('rerun-предупреждение перечисляет дефекты и требование секции', () => {
  const n = buildRerunNotice([MISSING, OTHER]);
  assert.ok(n.includes(MISSING) && n.includes(OTHER));
  assert.match(n, /Список посылок/u);
});
