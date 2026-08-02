/**
 * Зубы сравнения сводок дозора.
 *
 * Держат дефект, закрытый 02.08: запись `brace-expansion` (high) исчезла из снимка в утреннем
 * режиме, где сравнения не было вовсе, а вечерний режим печатал «закрыто за день: N» —
 * счётчик без имён и с причиной, которой прибор не измерял.
 *
 * Прогон: `node --test scripts/lib/deps-watch-diff.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diffFindings, formatChanged, formatDiffReport, formatGone, keyOf } from './deps-watch-diff.mjs';

const brace = {
  pkg: 'brace-expansion',
  id: '1124334',
  severity: 'high',
  issue: 'brace-expansion: DoS via unbounded expansion length',
  url: 'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
};
const other = { pkg: 'lodash', id: '999', severity: 'moderate', issue: 'x', url: 'u' };
const fresh = { pkg: 'axios', id: '777', severity: 'critical', issue: 'y', url: 'v' };

// ── Разница ───────────────────────────────────────────────────────────────────────────────

test('исчезнувшая запись попадает в gone поимённо, а не счётчиком', () => {
  const d = diffFindings([brace, other], [other]);
  assert.equal(d.gone.length, 1);
  assert.equal(d.gone[0].pkg, 'brace-expansion');
  assert.deepEqual(d.fresh, []);
});

test('появившаяся запись попадает в fresh', () => {
  const d = diffFindings([other], [other, fresh]);
  assert.deepEqual(d.fresh.map((f) => f.pkg), ['axios']);
  assert.deepEqual(d.gone, []);
});

test('совпадающий состав даёт пустую разницу', () => {
  const d = diffFindings([brace, other], [other, brace]);
  assert.deepEqual(d.fresh, []);
  assert.deepEqual(d.gone, []);
});

test('одна и та же уязвимость в разных пакетах — две записи, не одна', () => {
  const a = { pkg: 'a', id: '1', severity: 'high' };
  const b = { pkg: 'b', id: '1', severity: 'high' };
  assert.notEqual(keyOf(a), keyOf(b));
  assert.equal(diffFindings([a, b], [a]).gone.length, 1);
});

test('пустой прежний снимок: всё текущее — появившееся, исчезнувших нет', () => {
  const d = diffFindings([], [brace]);
  assert.equal(d.fresh.length, 1);
  assert.deepEqual(d.gone, []);
});

test('не список на входе не роняет предикат — дозор обязан пережить порчу снимка', () => {
  assert.deepEqual(diffFindings(null, undefined), { fresh: [], gone: [], changed: [] });
});

// ── Смена severity: третий исход ──────────────────────────────────────────────────────────

test('поднятая severity видна отдельной группой, а не тонет в «состав не менялся»', () => {
  // Дыра, найденная Дыниным на разборе блока: ключ pkg:id схлопывает такие записи, и реестр,
  // поднявший advisory с moderate до critical, прошёл бы мимо дозора молча.
  const before = { ...other, severity: 'moderate' };
  const after = { ...other, severity: 'critical' };
  const d = diffFindings([before], [after]);

  assert.deepEqual(d.fresh, []);
  assert.deepEqual(d.gone, []);
  assert.equal(d.changed.length, 1);
  assert.equal(d.changed[0].before.severity, 'moderate');
  assert.equal(d.changed[0].after.severity, 'critical');
});

test('смена severity НЕ печатается как исчезновение — запись сообщается', () => {
  const d = diffFindings([{ ...other, severity: 'low' }], [{ ...other, severity: 'high' }]);
  const joined = formatDiffReport(d, {}).join('\n');
  assert.ok(!joined.includes('исчезло из аудита'));
  assert.ok(joined.includes('сменили severity'));
});

test('направление смены названо словом: повышение и понижение читаются по-разному', () => {
  const up = formatChanged({ before: { ...other, severity: 'low' }, after: { ...other, severity: 'high' } });
  const down = formatChanged({ before: { ...other, severity: 'high' }, after: { ...other, severity: 'low' } });
  assert.ok(up.includes('ПОВЫШЕНА'));
  assert.ok(down.includes('понижена'));
});

test('совпадающая severity изменением не считается', () => {
  assert.deepEqual(diffFindings([other], [{ ...other }]).changed, []);
});

// ── Слова ─────────────────────────────────────────────────────────────────────────────────

test('о переставшей сообщаться записи НЕ говорится, что она закрыта', () => {
  const line = formatGone(brace);
  for (const forbidden of ['закрыт', 'исправл', 'починен', 'устранен', 'устранён']) {
    assert.ok(!line.toLowerCase().includes(forbidden), `слово «${forbidden}» утверждает непроверенное`);
  }
  assert.ok(line.includes('НЕ найдена'));
});

test('строка исчезнувшей записи несёт имя, severity, id и ссылку — читателю есть что проверить', () => {
  const line = formatGone(brace);
  assert.ok(line.includes('brace-expansion'));
  assert.ok(line.includes('high'));
  assert.ok(line.includes('1124334'));
  assert.ok(line.includes('GHSA-mh99-v99m-4gvg'));
});

test('запись без ссылки не ломает строку и не выдумывает адрес', () => {
  const line = formatGone({ pkg: 'x', severity: 'low' });
  assert.ok(line.startsWith('x (low)'));
  assert.ok(!line.includes('undefined'));
});

// ── Отчёт ─────────────────────────────────────────────────────────────────────────────────

test('пустая разница — это утверждение, а не молчание', () => {
  const lines = formatDiffReport({ fresh: [], gone: [], changed: [] }, { mode: 'morning' });
  assert.equal(lines.length, 1);
  // Длина строки проверяется отдельно: список из одной ПУСТОЙ строки прошёл бы зуб на длину
  // списка и остался бы молчанием (замечание Дынина на разборе блока).
  assert.ok(lines[0].trim().length > 0, 'строка непуста');
  assert.ok(lines[0].includes('не менялся'));
});

test('запрещённые слова изъяты из ОТЧЁТА ЦЕЛИКОМ, а не из одной функции', () => {
  // Зуб на formatGone проверял одну строку; вернуть «закрыто» можно было и из заголовка отчёта,
  // и из строки о смене severity — и тот зуб бы промолчал.
  const joined = formatDiffReport(
    {
      fresh: [fresh],
      gone: [brace],
      changed: [{ before: { ...other, severity: 'low' }, after: { ...other, severity: 'high' } }],
    },
    { mode: 'evening' },
  ).join('\n').toLowerCase();

  for (const forbidden of ['закрыт', 'исправл', 'починен', 'устранен', 'устранён']) {
    assert.ok(!joined.includes(forbidden), `слово «${forbidden}» утверждает непроверенное`);
  }
});

test('три группы не пересекаются: запись не может попасть в две разом', () => {
  const d = diffFindings(
    [brace, { ...other, severity: 'low' }],
    [{ ...other, severity: 'high' }, fresh],
  );
  const all = [...d.fresh, ...d.gone, ...d.changed.map((c) => c.after)];
  assert.equal(new Set(all.map(keyOf)).size, all.length, 'ключи в группах уникальны');
  assert.deepEqual([d.fresh.length, d.gone.length, d.changed.length], [1, 1, 1]);
});

test('в отчёте об исчезнувших есть предупреждение, что причина не измерена', () => {
  const lines = formatDiffReport(diffFindings([brace], []), { mode: 'evening' });
  const joined = lines.join('\n');
  assert.ok(joined.includes('исчезло из аудита (1)'));
  assert.ok(joined.includes('brace-expansion'));
  assert.ok(joined.includes('НЕ измерена'), 'незнание причины названо прямо');
});

test('появившиеся и исчезнувшие печатаются обе группы, а не первая попавшаяся', () => {
  const lines = formatDiffReport(diffFindings([brace], [fresh]), {});
  const joined = lines.join('\n');
  assert.ok(joined.includes('ПОЯВИЛИСЬ'));
  assert.ok(joined.includes('исчезло из аудита'));
});
