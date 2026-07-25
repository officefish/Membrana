import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractRefs,
  ageDays,
  validateDebt,
  healthMetrics,
  themeClusters,
  realActiveCount,
} from './lib/bridge-debts-health.mjs';

test('extractRefs: file:line symbol → symbol-ref; #N → issue', () => {
  const refs = extractRefs('code-review.mjs:160 anthropicPost; Issue #933; deepseek:task');
  const sym = refs.find((r) => r.kind === 'symbol');
  assert.equal(sym.file, 'code-review.mjs');
  assert.equal(sym.line, 160);
  assert.equal(sym.symbol, 'anthropicPost');
  assert.ok(refs.some((r) => r.kind === 'issue' && r.issue === 933));
});

test('extractRefs: вольный текст без ссылок → пусто (prose)', () => {
  assert.equal(extractRefs('Office транзиентно таймаутит — server-first нарушен').length, 0);
});

test('ageDays: детерминирован по ISO-датам; нечитаемое → 0', () => {
  assert.equal(ageDays('2026-07-22', '2026-07-25'), 3);
  assert.equal(ageDays('2026-07-25', '2026-07-25'), 0);
  assert.equal(ageDays('мусор', '2026-07-25'), 0);
});

test('validateDebt: символа нет в файле → stale-ref (случай codereview:160)', () => {
  const debt = { id: 'codereview', debt: '…', evidence: 'code-review.mjs:160 anthropicPost', status: 'open', date: '2026-07-22' };
  const r = validateDebt(debt, {
    resolveFile: () => 'import { invokeProcedureLlm } from "./ritual.mjs"; // прямой пост убран',
    today: '2026-07-25',
  });
  // файл вернулся, но символа anthropicPost в тексте нет
  assert.equal(r.verdict, 'stale-ref');
  assert.equal(r.deadRefs.length, 1);
  assert.match(r.deadRefs[0].why, /символа/u);
});

test('validateDebt: символ на месте, свежий → ok', () => {
  const debt = { id: 'x', debt: '…', evidence: 'foo.mjs:10 anthropicPost', status: 'open', date: '2026-07-25' };
  const r = validateDebt(debt, { resolveFile: () => 'function anthropicPost(){}', today: '2026-07-25' });
  assert.equal(r.verdict, 'ok');
  assert.equal(r.deadRefs.length, 0);
});

test('validateDebt: файла нет → stale-ref', () => {
  const debt = { id: 'x', debt: '…', evidence: 'gone.mjs:5', status: 'open', date: '2026-07-25' };
  const r = validateDebt(debt, { resolveFile: () => null, today: '2026-07-25' });
  assert.equal(r.verdict, 'stale-ref');
  assert.match(r.deadRefs[0].why, /файла нет/u);
});

test('validateDebt: старый долг без мёртвых ссылок → aged', () => {
  const debt = { id: 'x', debt: '…', evidence: 'нет ссылок', status: 'open', date: '2026-07-20' };
  const r = validateDebt(debt, { resolveFile: () => null, today: '2026-07-25', maxAgeDays: 3 });
  assert.equal(r.verdict, 'aged');
  assert.equal(r.age, 5);
});

test('validateDebt: issue-ссылку validate НЕ судит (её решает audit)', () => {
  const debt = { id: 'x', debt: '…', evidence: 'Issue #933', status: 'open', date: '2026-07-25' };
  const r = validateDebt(debt, { resolveFile: () => null, today: '2026-07-25' });
  assert.equal(r.verdict, 'ok');
  assert.equal(r.deadRefs.length, 0);
});

test('healthMetrics: заявлено vs реальный намёк, protruhших/prose', () => {
  const debts = [
    { id: 'a', debt: '', evidence: 'foo.mjs:1 bar', status: 'open', date: '2026-07-25' },
    { id: 'b', debt: '', evidence: 'gone.mjs:1', status: 'open', date: '2026-07-25' },
    { id: 'c', debt: '', evidence: 'вольный текст', status: 'open', date: '2026-07-25' },
    { id: 'd', debt: '', evidence: 'x', status: 'settled', date: '2026-07-22' },
  ];
  const vals = [
    { id: 'a', verdict: 'ok', deadRefs: [] },
    { id: 'b', verdict: 'stale-ref', deadRefs: [{ ref: 'gone.mjs:1', why: 'файла нет' }] },
    { id: 'c', verdict: 'aged', deadRefs: [] },
  ];
  const h = healthMetrics(debts, vals);
  assert.equal(h.declaredOpen, 3);
  assert.equal(h.settled, 1);
  assert.equal(h.staleRef, 1);
  assert.equal(h.prose, 1); // 'c' без ссылок
  assert.equal(h.realActiveHint, 2); // 3 open − 1 stale-ref
});

test('themeClusters: тема с ≥2 открытыми → кластер; settled и одиночки не в счёт', () => {
  const debts = [
    { id: 'a', debt: '', evidence: 'x', status: 'open', date: '2026-07-22', theme: 'каналы-LLM' },
    { id: 'b', debt: '', evidence: 'y', status: 'open', date: '2026-07-24', theme: 'каналы-LLM' },
    { id: 'c', debt: '', evidence: 'z', status: 'settled', date: '2026-07-22', theme: 'каналы-LLM' },
    { id: 'd', debt: '', evidence: 'w', status: 'open', date: '2026-07-25', theme: 'сны' },
  ];
  const cl = themeClusters(debts);
  assert.equal(cl.length, 1);
  assert.equal(cl[0].theme, 'каналы-LLM');
  assert.deepEqual(cl[0].ids.sort(), ['a', 'b']);
});

test('realActiveCount: кластер схлопывается в 1 узел; тема из одних стухших выпадает', () => {
  const debts = [
    { id: 'a', debt: '', evidence: 'x', status: 'open', date: '2026-07-22', theme: 'каналы-LLM' },
    { id: 'b', debt: '', evidence: 'y', status: 'open', date: '2026-07-24', theme: 'каналы-LLM' },
    { id: 'c', debt: '', evidence: 'z', status: 'open', date: '2026-07-25', theme: 'сны' },
    { id: 'd', debt: '', evidence: 'w', status: 'settled', date: '2026-07-22', theme: 'x' },
  ];
  // a стухла, но b в той же теме жива → узел «каналы-LLM» остаётся; «сны» жива → 2 узла
  const vals = [{ id: 'a', verdict: 'stale-ref' }, { id: 'b', verdict: 'ok' }, { id: 'c', verdict: 'ok' }];
  const r = realActiveCount(debts, vals);
  assert.equal(r.declaredOpen, 3);
  assert.equal(r.themeNodes, 2); // каналы-LLM + сны
  assert.equal(r.staleRef, 1);
  assert.equal(r.realActive, 2);
});

test('realActiveCount: тема, где ВСЕ долги стухли, выпадает из realActive', () => {
  const debts = [
    { id: 'a', debt: '', evidence: 'x', status: 'open', date: '2026-07-22', theme: 'dead' },
    { id: 'b', debt: '', evidence: 'y', status: 'open', date: '2026-07-25', theme: 'live' },
  ];
  const vals = [{ id: 'a', verdict: 'stale-ref' }, { id: 'b', verdict: 'ok' }];
  const r = realActiveCount(debts, vals);
  assert.equal(r.themeNodes, 2);
  assert.equal(r.realActive, 1); // 'dead' выпала (единственный долг стухший)
});
