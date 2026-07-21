/**
 * Фикстура зелёного каскада (интеграционный тест проходов 1+2 эпика ritual-refactor).
 *
 * Доказывает ДЕТЕРМИНИРОВАННО (без LLM, сети и живого ритуала), что инструментованный
 * каскад дня проходит стража Ангелины целиком: синтетические STRATEGY_DAY / DAILY_STANDUP /
 * MAIN_DAY_ISSUE строятся тем же helper'ом `provenanceHeader`, которым подписываются живые
 * генераторы, — и `orchestrateCascade` даёт ok. Это закрывает вопрос «зелёный каскад»
 * тестом, а не обещанием «увидим на живом утре».
 *
 * Плюс негативы: трогание производителя после чтения → stale → блок; потеря провенанса →
 * блок. Страж не декорация.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { provenanceHeader, contentDigest, buildSnapshot, parseProvenance } from './lib/angelina-adapter.mjs';
import { orchestrateCascade } from './lib/angelina-cascade.mjs';
import { CASCADE_DAY } from './angelina.mjs';

/**
 * Собрать инструментованный документ: тело + заголовок провенанса, как это делают живые
 * генераторы (strategy-day / _daily-standup / _main-day-issue).
 */
function doc(author, readAt, body) {
  return `${provenanceHeader({ author, readAt })}\n${body}\n`;
}

/** io-фейк над мапой файлов {path: {v: version, c: content}}. */
const ioOf = (files) => ({
  version: (p) => files[p]?.v ?? null,
  content: (p) => files[p]?.c ?? null,
});

/** Построить полный инструментованный день: горизонт → стендап → главный вопрос. */
function greenDay() {
  const files = {};
  // 1. Корень: горизонт (автор human, ничего не читает).
  files['docs/STRATEGY_DAY.md'] = { v: 'vS', c: doc('human', {}, '# Горизонт дня') };
  const sd = { version: 'vS', digest: contentDigest(files['docs/STRATEGY_DAY.md'].c) };
  // 2. Стендап читает горизонт (vesnin).
  files['docs/DAILY_STANDUP.md'] = { v: 'vU', c: doc('vesnin', { STRATEGY_DAY: sd }, '# Стендап') };
  const su = { version: 'vU', digest: contentDigest(files['docs/DAILY_STANDUP.md'].c) };
  // 3. Главный вопрос читает обоих (vesnin).
  files['docs/MAIN_DAY_ISSUE.md'] = {
    v: 'vM',
    c: doc('vesnin', { STRATEGY_DAY: sd, DAILY_STANDUP: su }, '# Центральная задача'),
  };
  return files;
}

test('зелёный каскад: инструментованный день проходит стража целиком (ok, ноль блоков)', () => {
  const files = greenDay();
  const report = orchestrateCascade(CASCADE_DAY, buildSnapshot(CASCADE_DAY, ioOf(files)));
  assert.equal(report.ok, true, `каскад чист, а не: ${JSON.stringify(report.results, null, 1).slice(0, 400)}`);
  assert.equal(report.firstBlocked, null);
  assert.equal(report.results.STRATEGY_DAY.freshness, 'fresh');
  assert.equal(report.results.DAILY_STANDUP.edges.STRATEGY_DAY, 'fresh', 'стендап прочитал свежий горизонт');
  assert.equal(report.results.MAIN_DAY_ISSUE.edges.DAILY_STANDUP, 'fresh', 'главный прочитал свежий стендап');
});

test('негатив: горизонт тронули после чтения → stale → каскад блокируется', () => {
  const files = greenDay();
  // Производителя перезаписали: новая версия и содержимое, потребители читали старую.
  files['docs/STRATEGY_DAY.md'] = { v: 'vS2', c: doc('human', {}, '# Горизонт (переписан)') };
  const report = orchestrateCascade(CASCADE_DAY, buildSnapshot(CASCADE_DAY, ioOf(files)));
  assert.equal(report.ok, false);
  assert.equal(report.results.DAILY_STANDUP.edges.STRATEGY_DAY, 'stale', 'чтение протухло');
  assert.equal(report.results.DAILY_STANDUP.blocked, true);
});

test('негатив: документ без провенанса → блок (молчун не проходит)', () => {
  const files = greenDay();
  files['docs/DAILY_STANDUP.md'] = { v: 'vU', c: '# Стендап без подписи' };
  const report = orchestrateCascade(CASCADE_DAY, buildSnapshot(CASCADE_DAY, ioOf(files)));
  assert.equal(report.ok, false);
  assert.match(report.results.DAILY_STANDUP.provenance, /нет провенанса/u);
});

test('живые генераторы совместимы: их заголовок разбирается парсером стража', () => {
  // Смоук на формат: заголовок, который эмитят strategy-day/_daily-standup/_main-day-issue.
  const h = provenanceHeader({ author: 'vesnin', readAt: { STRATEGY_DAY: { version: 'v1', digest: 'd1' } } });
  const parsed = parseProvenance(`${h}\n# тело`);
  assert.equal(parsed.author, 'vesnin');
  assert.deepEqual(parsed.readAt.STRATEGY_DAY, { version: 'v1', digest: 'd1' });
});
