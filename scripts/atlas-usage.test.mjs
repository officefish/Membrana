/**
 * Зубы вывода примеров в справочник (поправка Ф1, поле `usage`).
 *
 * Прогон: `node --test scripts/atlas-usage.test.mjs`
 */

import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  SAMPLE_MAX_LINES,
  collectUsage,
  renderUsageSection,
  workshopsWithoutUsage,
} from './lib/atlas-usage.mjs';
import { discoverContainers, renderAtlasRegistry } from './lib/tooling-atlas.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ws = (over = {}) => ({
  home: 'docs/x',
  kind: 'workshop',
  commands: { audit: 'yarn x:audit' },
  usage: { audit: { what: 'что даёт', sample: 'строка вывода', measuredAt: '2026-07-31' } },
  ...over,
});

test('живое дерево: пример мастерской скриптов доезжает целиком', () => {
  const entries = collectUsage(discoverContainers(repoRoot));
  const scripts = entries.find((e) => e.home === 'scripts' && e.verb === 'audit');
  assert.ok(scripts, 'мастерская скриптов заполнена первой');
  assert.equal(scripts.command, 'yarn scripts:orphans');
  assert.match(scripts.what, /бесхозные/u);
  assert.match(scripts.sample.join('\n'), /знаменатель/u);
  assert.equal(scripts.measuredAt, '2026-07-31');
});

test('команда берётся из verbs, а не из примера', () => {
  // Пример показывает ВЫВОД; вызывать надо то, что объявлено глаголом. Разъехаться они не
  // могут — зуб схемы держит подмножество.
  const e = collectUsage([ws({ commands: { audit: 'yarn настоящая' }, usage: { audit: { what: 'w', sample: 'yarn подделка', measuredAt: '2026-07-31' } } })]);
  assert.equal(e[0].command, 'yarn настоящая');
});

test('длинный вывод режется с честным хвостом, а не молча', () => {
  const long = Array.from({ length: SAMPLE_MAX_LINES + 3 }, (_, i) => `строка ${i}`).join('\n');
  const e = collectUsage([ws({ usage: { audit: { what: 'w', sample: long, measuredAt: '2026-07-31' } } })]);
  assert.equal(e[0].sample.length, SAMPLE_MAX_LINES);
  assert.equal(e[0].truncated, 3);
  const md = renderUsageSection(e, 1).join('\n');
  assert.match(md, /… и ещё 3 строк\(и\)/u, 'обрезка названа числом');
});

test('манифест без usage в сборе не участвует и не роняет её', () => {
  assert.deepEqual(collectUsage([ws({ usage: null }), ws({ usage: undefined }), ws({ usage: 'строка' })]), []);
  assert.deepEqual(collectUsage(null), []);
});

// ── Пустота говорит словами ───────────────────────────────────────────────────────────────

test('примеров нет — сказано словами, а не молчанием', () => {
  const md = renderUsageSection([], 13).join('\n');
  assert.match(md, /## Примеры вызова/u, 'секция есть даже пустая');
  assert.match(md, /ни у одной из \*\*13\*\* мастерских/u);
  // Отсутствие секции читалось бы как «примеры не предусмотрены», а правда — «не сняты».
  assert.match(md, /НЕ значит «инструменты без вывода»/u);
});

test('доля заполненности честная: сколько мастерских, а не сколько записей', () => {
  // Две записи у ОДНОЙ мастерской — это одна заполненная, а не две.
  const two = collectUsage([ws({
    commands: { audit: 'yarn a', decompose: 'yarn d' },
    usage: {
      audit: { what: 'w', sample: 's', measuredAt: '2026-07-31' },
      decompose: { what: 'w', sample: 's', measuredAt: '2026-07-31' },
    },
  })]);
  assert.equal(two.length, 2);
  assert.match(renderUsageSection(two, 13).join('\n'), /Заполнено у \*\*1\*\* мастерских из \*\*13\*\*/u);
});

test('незаполненные названы поимённо, а не долей', () => {
  const list = workshopsWithoutUsage([
    ws({ home: 'docs/b' }),
    ws({ home: 'docs/a', usage: null }),
    ws({ home: 'docs/c', usage: {} }),
    { home: 'docs/дом', kind: 'home' },
  ]);
  // Дома без мастерской сюда не входят: у них нет глаголов, и требовать примеров не с чего.
  assert.deepEqual(list, ['docs/a', 'docs/c']);
});

// ── Возраст, а не свежесть ────────────────────────────────────────────────────────────────

test('дата прогона печатается рядом с примером', () => {
  const md = renderUsageSection(collectUsage([ws()]), 1).join('\n');
  assert.match(md, /_замер 2026-07-31_/u);
  // Свежесть не обещается — обещать было бы ложью, сверить машинно нельзя.
  assert.match(md, /снимок, а не гарантия/u);
  assert.doesNotMatch(md, /актуально|проверено сейчас/u);
});

// ── Интеграция в индекс ───────────────────────────────────────────────────────────────────

test('индекс несёт секцию примеров и список незаполненных', () => {
  const md = renderAtlasRegistry(discoverContainers(repoRoot));
  assert.match(md, /## Примеры вызова/u);
  assert.match(md, /`yarn scripts:orphans` — scripts/u);
  assert.match(md, /_замер 2026-07-31_/u);
  assert.match(md, /Без примеров: /u, 'двенадцать незаполненных названы, а не умолчаны');
});

test('справочник агрегирует, а не сочиняет: текст примера — из манифеста', () => {
  const containers = discoverContainers(repoRoot);
  const scripts = containers.find((c) => c.home === 'scripts');
  const md = renderAtlasRegistry(containers);
  // §3: копий нет — собственного описания инструментов справочник не держит.
  assert.ok(md.includes(scripts.usage.audit.what), 'формулировка взята из манифеста дословно');
});
