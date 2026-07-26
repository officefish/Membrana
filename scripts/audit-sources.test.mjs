/**
 * Тесты адаптеров источников (#1238, фаза А2) — на данных известных расхождений 25.07.
 *
 * Каждый тест воспроизводит находку, разобранную вручную: если адаптер её не даёт,
 * приёмка А4 не сдана. Файловой системы нет — адаптеры получают уже прочитанное.
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { reconcile } from './lib/audit-concentrate.mjs';
import {
  factsFromCardVsIssue,
  factsFromProcedureState,
  factsFromResponsibility,
  factsFromRitualTrace,
  factsFromSnapshotLinks,
} from './lib/audit-sources.mjs';

const verdictOf = (facts) => reconcile(facts).subjects[0];

test('находка 1: комната закрыта в дереве, открыта в общей ветке → противоречие', () => {
  const s = verdictOf(factsFromProcedureState({
    procedure: 'bridge',
    worktreeState: { phase: 'closed', day: null },
    mainState: { phase: 'opened', day: '2026-07-22' },
  }));
  assert.equal(s.verdict, 'conflict');
  assert.equal(s.claims.length, 2, 'обе версии сохранены');
  assert.ok(s.claims.some((c) => c.claim.includes('opened')));
});

test('находка 1 (обратная): согласованное состояние → подтверждение, не шум', () => {
  const s = verdictOf(factsFromProcedureState({
    procedure: 'bridge',
    worktreeState: { phase: 'closed', day: null },
    mainState: { phase: 'closed', day: null },
  }));
  assert.equal(s.verdict, 'confirmed');
});

test('находка 2: вечер заявлен проведённым, артефактов в ветке нет → противоречие', () => {
  const s = verdictOf(factsFromRitualTrace({
    day: '2026-07-24',
    ritual: 'вечерний ритуал',
    claimedRun: true,
    artifactsInMain: [],
  }));
  assert.equal(s.verdict, 'conflict');
  assert.ok(s.claims.some((c) => c.claim === 'проведён'));
  assert.ok(s.claims.some((c) => c.claim.includes('следов в общей ветке нет')));
});

test('находка 2 (день с артефактами): заявление и следы совпали', () => {
  const s = verdictOf(factsFromRitualTrace({
    day: '2026-07-25',
    ritual: 'вечерний ритуал',
    claimedRun: true,
    artifactsInMain: ['archive/daily-day/2026-07-25', 'DAILY_CODE_REVIEW снимок'],
  }));
  assert.equal(s.verdict, 'confirmed');
});

test('находка 3: снимок ссылается на файлы, которых нет → противоречие с перечнем', () => {
  const s = verdictOf(factsFromSnapshotLinks({
    snapshot: 'PRECEDENTS',
    referenced: ['a.md', 'b.md', 'c.md'],
    existing: ['a.md'],
  }));
  assert.equal(s.verdict, 'conflict');
  const dead = s.claims.find((c) => c.claim.includes('пустоту'));
  assert.ok(dead, 'мёртвые ссылки названы');
  assert.ok(dead.evidence.join(' ').includes('b.md'));
});

test('находка 4: ответственный назначен, следа участия нет → противоречие (заглушка)', () => {
  const s = verdictOf(factsFromResponsibility({
    card: 'bridge-cross-agent-skill',
    leadPersona: 'ozhegov',
    participationTraces: [],
  }));
  assert.equal(s.verdict, 'conflict');
  assert.ok(s.claims.some((c) => c.claim === 'следа участия нет'));
});

test('находка 4 (честный случай): есть след участия → подтверждение', () => {
  const s = verdictOf(factsFromResponsibility({
    card: 'bridge-room',
    leadPersona: 'ozhegov',
    participationTraces: ['спроектировал этапы Б1–Б5 в промпте спринта'],
  }));
  assert.equal(s.verdict, 'confirmed');
});

test('пара 5: карточка активна, иссью закрыт → противоречие', () => {
  const s = verdictOf(factsFromCardVsIssue({
    card: 'consilium-save-path-test',
    registryStatus: 'active',
    issueState: 'CLOSED',
  }));
  assert.equal(s.verdict, 'conflict');
  assert.deepEqual(s.claims.map((c) => c.claim).sort(), ['активна', 'закрыта']);
});

test('пара 5: согласованный жизненный цикл → подтверждение двумя независимыми', () => {
  const s = verdictOf(factsFromCardVsIssue({
    card: 'kits-pins-wiring',
    registryStatus: 'archived',
    issueState: 'CLOSED',
  }));
  assert.equal(s.verdict, 'confirmed');
  assert.equal(s.voices, 2);
});

test('отсутствие данных не выдаётся за согласие: один источник → без подтверждения', () => {
  const s = verdictOf(factsFromCardVsIssue({
    card: 'run-ledger',
    registryStatus: 'active',
    issueState: null,
  }));
  assert.equal(s.verdict, 'unbacked', 'молчание внешнего источника — не подтверждение');
});
