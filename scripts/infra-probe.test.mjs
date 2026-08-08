import assert from 'node:assert/strict';
import { test } from 'node:test';

import { classifyOutcome, diagnosePair } from './llm-probe.mjs';
import { OUTCOME_IDS } from './network/lib/classify.mjs';

// Первые зубы infra-probe (блок 2 спринта llm-probe-still-lies-net, #1804). До сегодня их
// было НОЛЬ — при том, что модуль импортирует классификатор напрямую и решает, красным ли
// звено. Прибор без зубов судил инфраструктуру и не отвечал ни за одно своё слово.
//
// Сетевые пути (`tcpProbe`, `probeLink`) наружу не экспортируются и требуют сокета, поэтому
// проверяется контракт СЛОВАРЯ: infra-probe обязан говорить теми же исходами, что и всё
// остальное. Прежде он писал `net` в четырёх местах — включая отказ `gh`, где сеть никто
// не мерил.

test('#1804: infra-probe не несёт собственных слов — исходы только из перечня #1449', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./infra-probe.mjs', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  // Ловим ровно то, что уходит в linkStatus/res как готовое слово-исход.
  const literals = [...src.matchAll(/(?:res|linkStatus)\(\s*(?:link\s*,\s*)?'([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(literals.length > 0, 'литералы исходов должны находиться — иначе зуб проверяет пустоту');
  for (const w of literals) {
    assert.ok(
      OUTCOME_IDS.includes(w) || w === 'skipped',
      `«${w}» вне закрытого перечня #1449 — это снова свой словарь`,
    );
  }
});

test('#1804: слова прежнего словаря из infra-probe исчезли', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./infra-probe.mjs', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  for (const old of ["'net'", "'no-key'", "'dpi-block'", "'tls-fail'", "'auth/geo'"]) {
    assert.ok(!src.includes(old), `в исполняемом коде остался ${old}`);
  }
  assert.ok(!/net \(/u.test(src), 'осталась строка вида «net (…)» — то же слово с пояснением');
});

test('отказ `gh` больше не зовётся сетью: инструмент молчит ≠ сеть мертва', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./infra-probe.mjs', import.meta.url), 'utf8');
  const from = src.indexOf("method.startsWith('gh-api')");
  assert.ok(from > 0, 'ветка gh-api должна находиться — иначе зуб проверяет пустоту');
  assert.match(
    src.slice(from, from + 900),
    /unknown_protocol/u,
    'нет авторизации/бинаря/лимит — это честное незнание, а не измеренная сеть',
  );
});

test('исходы TCP-зонда разделены по причине — три бывших «net»', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./infra-probe.mjs', import.meta.url), 'utf8');
  const probe = src.slice(src.indexOf('function tcpProbe'), src.indexOf('async function fetchBalance'));
  // Битый URL, молчание в срок и отказ сокета чинятся по-разному, поэтому и зовутся по-разному.
  assert.match(probe, /unknown_protocol/u, 'строка не URL — зонд даже не начинался');
  assert.match(probe, /timeout_idle/u, 'молчание в срок');
  assert.match(probe, /tcp_fail/u, 'отказ соединения');
  assert.match(probe, /dns_fail/u, 'имя не разрешилось');
  assert.ok(!/res\('net'\)/u.test(probe), 'старое общее слово ушло');
});

test('вердикт пары приходит от общего предиката, а не от копии в infra-probe', () => {
  // infra-probe зовёт diagnosePair/classifyOutcome из llm-probe, а тот — классификатор
  // #1449. Проверяем сквозняком: то, что раньше было `net`, теперь именуется причиной.
  assert.equal(classifyOutcome({ errorCode: 'ENOTFOUND', error: 'getaddrinfo' }), 'dns_fail');
  assert.equal(diagnosePair('dns_fail', 'ok'), 'proxy_intercept (только через прокси)');
});
