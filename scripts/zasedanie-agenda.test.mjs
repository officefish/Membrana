// S-Z1: повестка заседания несёт ровно один ID-вопрос.
// Регламент: docs/ZASEDANIE_REGULATION.md
import { strict as assert } from 'node:assert';
import test from 'node:test';

import { zasedanieAgendaProblem } from './lib/protocol-validator.mjs';

test('один вопрос — повестка годна', () => {
  assert.equal(zasedanieAgendaProblem('## Вопрос\n\n**A1 — свести граф с ADR или разделить?**\n'), '');
});

test('два вопроса — отказ (S-Z1)', () => {
  const problem = zasedanieAgendaProblem('**A1 — свести с ADR?**\n**A2 — какая форма записи?**\n');
  assert.match(problem, /2 вопрос/u);
  assert.match(problem, /A1, A2/u);
});

test('десять вопросов — отказ; ровно случай 17.07', () => {
  const md = Array.from({ length: 10 }, (_, i) => `**Q${i + 1} — вопрос ${i + 1}**`).join('\n');
  assert.match(zasedanieAgendaProblem(md), /10 вопрос/u);
});

test('ноль вопросов — тоже отказ: вердикту не на чем встать', () => {
  assert.match(zasedanieAgendaProblem('Прозаичная повестка без меток.'), /без ID-вопроса/u);
});

test('З0 не спецслучай: один вопрос о порядке + кандидаты прозой', () => {
  // Ключ формата: кандидаты БЕЗ жирных ID → регексп rt-6 их не видит,
  // правило «ровно один вопрос» держится единообразно, флаг-исключение не нужен.
  const z0 = [
    '# З0 — установочное',
    '',
    '**O1 — какой порядок зависимостей у вопросов задания?**',
    '',
    '## Кандидаты (материал, не повестка)',
    '',
    '- свести граф с ADR или разделить',
    '- форма записи вердикта',
    '- охлаждение сессии на правде',
    '- инструменты редактирования',
  ].join('\n');
  assert.equal(zasedanieAgendaProblem(z0), '');
});

test('ВОЗВРАТ БАГА: кандидат с жирным ID ломает З0 — и это ловится', () => {
  // Если председатель по привычке разметит кандидата жирным ID, повестка станет
  // двухвопросной. Гейт обязан покраснеть — иначе З0 тихо превратится в тот самый
  // многовопросный консилиум, ради отмены которого формат и заведён.
  const z0broken = '**O1 — какой порядок?**\n\n- **B2 — форма записи вердикта**\n';
  assert.notEqual(zasedanieAgendaProblem(z0broken), '');
});

test('null/undefined не роняют ядро', () => {
  assert.match(zasedanieAgendaProblem(null), /без ID-вопроса/u);
  assert.match(zasedanieAgendaProblem(undefined), /без ID-вопроса/u);
});
