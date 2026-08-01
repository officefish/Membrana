/**
 * Зубы поля `usage` — поправка к Ф1 от 31.07.
 *
 * Прогон: `node --test scripts/usage-schema.test.mjs`
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { USAGE_RECORD_KEYS, workshopSchemaProblems } from './lib/validate-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Годный манифест с одним глаголом и одним примером. */
const manifest = (over = {}) => ({
  pattern: 'docs/patterns/HOME_WORKSHOP.md',
  name: 'мастерская',
  worksOn: 'docs/x',
  kit: null,
  verbs: { audit: 'yarn x:audit', decompose: 'yarn x:decompose', inspectElement: null, stackLike: [], domain: [] },
  ...over,
});

const usage = (over = {}) => ({
  what: 'что даёт вызов',
  sample: 'строка вывода',
  measuredAt: '2026-07-31',
  ...over,
});

const problemsOf = (m) => workshopSchemaProblems(m).problems;

// ── Совместимость: тринадцать живых манифестов не сломаны ─────────────────────────────────

test('usage необязателен — манифест без него валиден', () => {
  assert.deepEqual(problemsOf(manifest()), []);
});

test('живой манифест мастерской скриптов с usage валиден', () => {
  const m = JSON.parse(readFileSync(join(repoRoot, 'scripts/workshop.manifest.json'), 'utf8'));
  assert.ok(m.usage, 'пример должен быть заполнен настоящим прогоном');
  assert.deepEqual(problemsOf(m), []);
});

// ── Подмножество verbs ────────────────────────────────────────────────────────────────────

test('пример для несуществующего глагола — дефект, а не лишняя строка', () => {
  const p = problemsOf(manifest({ usage: { нетТакого: usage() } }));
  assert.equal(p.length, 1);
  assert.match(p[0], /дверь, которой не существует/u);
});

test('пример для объявленного глагола проходит', () => {
  assert.deepEqual(problemsOf(manifest({ usage: { audit: usage() } })), []);
  // Ключ verbs со значением null тоже объявлен — пример к нему законен: глагол есть,
  // просто вынесен вовне.
  assert.deepEqual(problemsOf(manifest({ usage: { inspectElement: usage() } })), []);
});

test('пример для доменного инструмента проходит только при объявленной команде', () => {
  const domain = [{ name: 'reconcile', worksOn: 'docs/x', tool: 'yarn x:reconcile' }];
  assert.deepEqual(problemsOf(manifest({
    verbs: { audit: 'yarn x:audit', decompose: 'yarn x:decompose', inspectElement: null, stackLike: [], domain },
    usage: { reconcile: usage() },
  })), []);

  const p = problemsOf(manifest({
    verbs: { audit: 'yarn x:audit', decompose: 'yarn x:decompose', inspectElement: null, stackLike: [], domain: [{ name: 'reconcile', worksOn: 'docs/x' }] },
    usage: { reconcile: usage() },
  }));
  assert.ok(p.some((x) => /доменный инструмент не объявляет tool/u.test(x)));
});

test('имена доменных инструментов уникальны и не конфликтуют с общими глаголами', () => {
  const duplicate = problemsOf(manifest({
    verbs: { audit: 'yarn x:audit', decompose: 'yarn x:decompose', inspectElement: null, stackLike: [], domain: [
      { name: 'scan', worksOn: 'docs/x' },
      { name: 'scan', worksOn: 'docs/x' },
    ] },
  }));
  assert.ok(duplicate.some((x) => /повтор: scan/u.test(x)));

  const collision = problemsOf(manifest({
    verbs: { audit: 'yarn x:audit', decompose: 'yarn x:decompose', inspectElement: null, stackLike: [], domain: [{ name: 'audit', worksOn: 'docs/x' }] },
  }));
  assert.ok(collision.some((x) => /конфликт с глаголом: audit/u.test(x)));
});

// ── Форма записи ──────────────────────────────────────────────────────────────────────────

test('все три поля записи обязательны — половина хуже отсутствия', () => {
  assert.deepEqual(USAGE_RECORD_KEYS, ['what', 'sample', 'measuredAt']);
  for (const missing of USAGE_RECORD_KEYS) {
    const rec = usage();
    delete rec[missing];
    const p = problemsOf(manifest({ usage: { audit: rec } }));
    // Половина записи выглядит документацией, ею не будучи.
    assert.ok(p.some((x) => x.includes(`usage.audit.${missing}`)), `${missing} обязано ловиться`);
  }
});

test('пустая строка полем не считается', () => {
  for (const f of USAGE_RECORD_KEYS) {
    const p = problemsOf(manifest({ usage: { audit: usage({ [f]: '   ' }) } }));
    assert.ok(p.some((x) => x.includes(`usage.audit.${f}`)), f);
  }
});

test('measuredAt — строго YYYY-MM-DD', () => {
  for (const bad of ['31.07.2026', '2026-7-1', 'вчера', '2026/07/31']) {
    const p = problemsOf(manifest({ usage: { audit: usage({ measuredAt: bad }) } }));
    assert.ok(p.some((x) => /measuredAt — не YYYY-MM-DD/u.test(x)), bad);
  }
  assert.deepEqual(problemsOf(manifest({ usage: { audit: usage({ measuredAt: '2026-01-09' }) } })), []);
});

test('лишнее поле записи ловится поимённо', () => {
  const p = problemsOf(manifest({ usage: { audit: usage({ автор: 'кто-то' }) } }));
  assert.ok(p.some((x) => /usage\.audit: лишнее поле автор/u.test(x)));
});

test('usage не объект — отказ с адресом', () => {
  assert.ok(problemsOf(manifest({ usage: 'строка' })).some((x) => /usage — не объект/u.test(x)));
  assert.ok(problemsOf(manifest({ usage: ['a'] })).some((x) => /usage — не объект/u.test(x)));
  assert.ok(problemsOf(manifest({ usage: { audit: 'строка' } })).some((x) => /usage\.audit — не объект/u.test(x)));
});

// ── Чего поправка НЕ делает ───────────────────────────────────────────────────────────────

test('verbs остаётся строкой — мутации не произошло', () => {
  // typeof verbs[k] === 'string' читают валидатор, справочник, пол сессии и прибор
  // мастерской: мутация уронила бы тринадцать манифестов разом.
  const m = JSON.parse(readFileSync(join(repoRoot, 'scripts/workshop.manifest.json'), 'utf8'));
  assert.equal(typeof m.verbs.audit, 'string');
  assert.equal(typeof m.verbs.decompose, 'string');
});

test('sample не сверяется с реальностью — обещать такое было бы ложью', () => {
  // Вывод меняется законно; проверяются форма, подмножество и наличие даты, не содержание.
  const p = problemsOf(manifest({ usage: { audit: usage({ sample: 'заведомая чушь, не вывод' }) } }));
  assert.deepEqual(p, [], 'машина о правдивости примера не судит');
});
