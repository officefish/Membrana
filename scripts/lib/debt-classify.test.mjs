import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  classifyAll,
  classifyDebt,
  countOpenWork,
  hasPassport,
  legalized,
  wellArchived,
} from './debt-classify.mjs';

const STUBS = new URL(
  '../../docs/cowork-sprint/cowork-execution-registry/team-snapshot-cold-migration/stubs/',
  import.meta.url,
);

function loadFixtureRegistry() {
  return JSON.parse(readFileSync(new URL('registry.fixture.json', STUBS), 'utf8')).tasks;
}

function loadClosures() {
  const raw = JSON.parse(readFileSync(new URL('closure-artifact.fixture.json', STUBS), 'utf8'));
  return new Map(Object.entries(raw.closures));
}

test('паспорт = GitHub-issue (аксиома M1)', () => {
  assert.equal(hasPassport({ githubIssue: 178 }), true);
  assert.equal(hasPassport({ githubIssue: null }), false);
  assert.equal(hasPassport({}), false);
  assert.equal(hasPassport({ githubIssue: '178' }), false, 'строка — не паспорт');
});

test('wellArchived = inCold ∧ hasPassport ∧ archivedAt≠null — все три обязательны', () => {
  const card = { githubIssue: 178, archivedAt: '2026-06-29' };
  assert.equal(wellArchived(card, true), true);
  assert.equal(wellArchived(card, false), false, 'не в холоде');
  assert.equal(wellArchived({ ...card, githubIssue: null }, true), false, 'нет паспорта');
  assert.equal(wellArchived({ ...card, archivedAt: null }, true), false, 'нет archivedAt');
});

test('classifyDebt: все четыре ветки M4 + none', () => {
  // ¬hasPassport ∧ ¬wellArchived → legality
  assert.equal(classifyDebt({ githubIssue: null, archivedAt: '2026-05-03' }), 'legality');
  // hasPassport ∧ issueClosed ∧ ¬archivedAt → record
  assert.equal(
    classifyDebt({ githubIssue: 501, githubIssueClosedAt: '2026-07-04', archivedAt: null }),
    'record',
  );
  // hasPassport ∧ ¬issueClosed ∧ ¬workDone → work
  assert.equal(
    classifyDebt(
      { githubIssue: 502, githubIssueClosedAt: null, archivedAt: null },
      { closure: { lgtmBy: '', headRevision: null } },
    ),
    'work',
  );
  // статус неустановим (нет артефакта закрытия) → owner-knowledge
  assert.equal(
    classifyDebt({ githubIssue: 503, githubIssueClosedAt: null, archivedAt: null }),
    'owner-knowledge',
  );
  // полностью законная запись → долга нет
  assert.equal(
    classifyDebt(
      { githubIssue: 500, githubIssueClosedAt: '2026-07-02', archivedAt: '2026-07-02' },
      { inCold: true },
    ),
    'none',
  );
});

test('hasPassport=false НЕ влечёт workDone=false: без паспорта — legality, не work (пилот M4)', () => {
  // Сделанная работа без паспорта (17 из 20 старейших) не поднимает счётчик работ.
  const doneNoPassport = { githubIssue: null, archivedAt: null };
  assert.equal(classifyDebt(doneNoPassport, { closure: { lgtmBy: 'vesnin' } }), 'legality');
});

test('фикстурный реестр: представители классов размечаются как в M4', () => {
  const cards = loadFixtureRegistry();
  const closures = loadClosures();
  const entries = classifyAll(cards, {
    coldIds: new Set(['issue-178-async-v2-reconciliation', 'fixture-well-archived']),
    closures,
    parked: new Map([['fixture-db-h1b-defect', '2026-07-19']]),
  });
  const byId = new Map(entries.map((e) => [e.id, e]));

  assert.equal(byId.get('issue-178-async-v2-reconciliation').debtClass, 'none');
  assert.equal(byId.get('issue-178-async-v2-reconciliation').wellArchived, true);
  assert.equal(byId.get('fixture-well-archived').debtClass, 'none');
  assert.equal(byId.get('fixture-active-no-issue').debtClass, 'legality');
  assert.equal(byId.get('fixture-archived-pre-passport').debtClass, 'legality');
  assert.equal(byId.get('fixture-record-debt').debtClass, 'record');
  assert.equal(byId.get('fixture-work-debt').debtClass, 'work');
  assert.equal(byId.get('fixture-owner-knowledge').debtClass, 'owner-knowledge');
  // дефект db-h1b: parked внутри owner-knowledge, дата запроса видна, дату архивации не досочиняем
  const defect = byId.get('fixture-db-h1b-defect');
  assert.equal(defect.parked, true);
  assert.equal(defect.debtClass, 'owner-knowledge');
  assert.equal(defect.parkedSince, '2026-07-19');
});

test('счётчик незакрытых работ читает ТОЛЬКО work: 258 архивных без паспорта не поднимают его ни на единицу', () => {
  const archived258 = Array.from({ length: 258 }, (_, i) => ({
    id: `archived-pre-passport-${i}`,
    githubIssue: null,
    status: 'archived',
    archivedAt: '2026-05-03',
  }));
  const entries = classifyAll(archived258);
  assert.equal(entries.every((e) => e.debtClass === 'legality'), true);
  assert.equal(countOpenWork(entries), 0);
});

test('153 активных без Issue → legality (путь легализации — выписка), счётчик работ не растёт', () => {
  const active153 = Array.from({ length: 153 }, (_, i) => ({
    id: `active-no-issue-${i}`,
    githubIssue: null,
    status: 'active',
    archivedAt: null,
  }));
  const entries = classifyAll(active153);
  assert.equal(entries.every((e) => e.debtClass === 'legality'), true);
  assert.equal(countOpenWork(entries), 0);
});

test('parked не поднимает счётчик работ даже гипотетически', () => {
  const cards = [
    { id: 'parked-card', githubIssue: 700, githubIssueClosedAt: null, archivedAt: null },
    { id: 'real-work', githubIssue: 701, githubIssueClosedAt: null, archivedAt: null },
  ];
  const closures = new Map([
    ['parked-card', { lgtmBy: '' }],
    ['real-work', { lgtmBy: '' }],
  ]);
  const entries = classifyAll(cards, { closures, parked: new Map([['parked-card', '2026-07-19']]) });
  assert.equal(countOpenWork(entries), 1, 'считается только не-parked work');
});

test('легализация рубежом видима: legalizedBy различает «паспорт был» и «принят рубежом»', () => {
  assert.equal(legalized({ legalizedBy: 'cutoff-2026-07-19' }), true);
  assert.equal(legalized({}), false);
});

test('детерминизм: та же фикстура → та же классификация бит-в-бит', () => {
  const cards = loadFixtureRegistry();
  const ctx = { coldIds: new Set(['fixture-well-archived']), closures: loadClosures() };
  assert.equal(JSON.stringify(classifyAll(cards, ctx)), JSON.stringify(classifyAll(cards, ctx)));
});
