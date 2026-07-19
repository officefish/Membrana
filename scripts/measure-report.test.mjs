import assert from 'node:assert/strict';
import test from 'node:test';

import { makeSnapshotPair } from './lib/measure-fixtures.mjs';
import { computeTeamMetrics } from './lib/measure-metrics.mjs';
import { DELIBERATELY_UNMEASURED, renderTeamMetricsReport, WIP_DISCLAIMER } from './lib/measure-report.mjs';

function renderedFixture() {
  const { prev, curr, closureArtifacts } = makeSnapshotPair();
  return renderTeamMetricsReport(computeTeamMetrics(prev, curr, closureArtifacts));
}

test('honest-шапка в отчёте: окно, ревизии обоих снимков, множество артефактов', () => {
  const report = renderedFixture();
  assert.match(report, /\[2026-07-18T18:00:00\.000Z, 2026-07-19T18:00:00\.000Z\)/);
  assert.ok(report.includes('f'.repeat(40)), 'ревизия снимка t−1');
  assert.ok(report.includes('e'.repeat(40)), 'ревизия снимка t');
  assert.match(report, /Учтённые артефакты закрытия \(1\): `t-2`/);
});

test('обязательная подпись wip присутствует дословно', () => {
  const report = renderedFixture();
  assert.ok(report.includes(WIP_DISCLAIMER));
  assert.equal(WIP_DISCLAIMER, 'wip = очередь намерений, не производительность');
});

test('секция «намеренно неизмеримое» — явным текстом, три пункта', () => {
  const report = renderedFixture();
  assert.match(report, /## Намеренно неизмеримое/);
  assert.equal(DELIBERATELY_UNMEASURED.length, 3);
  for (const item of DELIBERATELY_UNMEASURED) assert.ok(report.includes(item));
});

test('ни одна объёмная величина не выводится в одиночку — пары названы', () => {
  const report = renderedFixture();
  assert.match(report, /### leadTime · пара: reworkRate \(риторическая, аудит дня\)/);
  assert.match(report, /### wip · пара: throughput/);
  assert.match(report, /### throughput · пара: reworkRate/);
  assert.match(report, /### ownerlessRate · ограничитель, норма 0%/);
  assert.match(report, /### escalationRate · ограничитель, направление вниз/);
});

test('риторическая величина упомянута как живущая только в аудите дня', () => {
  assert.match(renderedFixture(), /риторическая величина: живёт только в аудите/);
});

test('значения величин доходят до отчёта', () => {
  const report = renderedFixture();
  assert.match(report, /`t-2`: 54\.0ч/); // leadTime
  assert.match(report, /16\.7% \(1 из 6 единиц без `leadPersona`\)/); // ownerlessRate
  assert.match(report, /- vesnin: 2/); // wip
  assert.match(report, /- dynin: 1/); // throughput
  assert.match(report, /20\.0% \(1 из 5 единиц/); // escalationRate
});

test('результат без honest-шапки не рендерится', () => {
  assert.throws(() => renderTeamMetricsReport({ header: {}, metrics: {} }), /без honest-шапки/);
});

test('рендер детерминирован: тот же вход — тот же текст бит-в-бит', () => {
  assert.equal(renderedFixture(), renderedFixture());
});
