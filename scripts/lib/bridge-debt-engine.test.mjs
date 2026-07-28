/**
 * Зуб движка долгов (M6/#1352): идемпотентность, закрытый enum, blocks_open,
 * явное рождение — оба пути, не только счастливый.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  birthVerb,
  blocksOpenStatus,
  foldLedger,
  migrationEvents,
  parkVerb,
  renderLegacySnapshot,
  repayVerb,
  repeatVerb,
} from './bridge-debt-engine.mjs';

const AT = '2026-07-28T09:00:00Z';

function play(...intents) {
  const events = [];
  for (const intent of intents) {
    const state = foldLedger(events);
    const { event } = intent(state);
    if (event) events.push(event);
  }
  return foldLedger(events);
}

test('birth: рождение только явное — без origin из перечня долг не рождается (M6)', () => {
  const { event, note } = birthVerb(new Map(), { id: 'd1', debt: 'x', evidence: 'e', origin: 'observation', at: AT });
  assert.equal(event, null);
  assert.match(note, /ТОЛЬКО явное/u);
  assert.ok(birthVerb(new Map(), { id: 'd1', debt: 'x', evidence: 'e', origin: 'captain_gesture', at: AT }).event);
});

test('birth идемпотентен: живой долг не дублируется тем же id', () => {
  const state = play(
    (s) => birthVerb(s, { id: 'd1', debt: 'x', evidence: 'e', origin: 'detector', at: AT }),
    (s) => birthVerb(s, { id: 'd1', debt: 'другое', evidence: 'e2', origin: 'detector', at: AT }),
  );
  assert.equal(state.size, 1);
  assert.equal(state.get('d1').debt, 'x');
});

test('repeat: только из open|repeated; растит count и noiseScore; blocks_open держится', () => {
  const state = play(
    (s) => birthVerb(s, { id: 'd1', debt: 'x', evidence: 'e', origin: 'carry', at: AT }),
    (s) => repeatVerb(s, { id: 'd1', at: AT }),
    (s) => repeatVerb(s, { id: 'd1', at: AT }),
  );
  const d = state.get('d1');
  assert.equal(d.status, 'repeated');
  assert.equal(d.repeatCount, 2);
  assert.equal(d.noiseScore, 2);
  assert.ok(blocksOpenStatus(d.status));
});

test('repay: provenance обязателен из enum, fact_ref требует ссылку, идемпотентен на repaid', () => {
  const alive = play((s) => birthVerb(s, { id: 'd1', debt: 'x', evidence: 'e', origin: 'lead_gesture', at: AT }));
  assert.equal(repayVerb(alive, { id: 'd1', provenance: 'по-настроению', at: AT }).event, null);
  assert.match(repayVerb(alive, { id: 'd1', provenance: 'fact_ref', at: AT }).note, /--fact/u);
  const repaid = play(
    (s) => birthVerb(s, { id: 'd1', debt: 'x', evidence: 'e', origin: 'lead_gesture', at: AT }),
    (s) => repayVerb(s, { id: 'd1', provenance: 'captain_word', at: AT }),
  );
  assert.equal(repaid.get('d1').status, 'repaid');
  assert.equal(repaid.get('d1').repayProvenance, 'captain_word');
  const again = repayVerb(repaid, { id: 'd1', provenance: 'captain_word', at: AT });
  assert.equal(again.event, null);
  assert.match(again.note, /идемпотентно/u);
});

test('park: снимает из антецедента гейта, но НЕ repaid; parked → open — явный повторный birth', () => {
  const parked = play(
    (s) => birthVerb(s, { id: 'd1', debt: 'x', evidence: 'e', origin: 'captain_gesture', at: AT }),
    (s) => parkVerb(s, { id: 'd1', at: AT }),
  );
  assert.equal(parked.get('d1').status, 'parked');
  assert.ok(!blocksOpenStatus('parked') && !blocksOpenStatus('repaid'));
  const reopened = play(
    (s) => birthVerb(s, { id: 'd1', debt: 'x', evidence: 'e', origin: 'captain_gesture', at: AT }),
    (s) => parkVerb(s, { id: 'd1', at: AT }),
    (s) => birthVerb(s, { id: 'd1', debt: 'x', evidence: 'e', origin: 'captain_gesture', at: AT }),
  );
  assert.equal(reopened.get('d1').status, 'open');
});

test('repaid не воскресает молча тем же id — только новый id (append-only история)', () => {
  const state = play(
    (s) => birthVerb(s, { id: 'd1', debt: 'x', evidence: 'e', origin: 'captain_gesture', at: AT }),
    (s) => repayVerb(s, { id: 'd1', provenance: 'captain_word', at: AT }),
    (s) => birthVerb(s, { id: 'd1', debt: 'снова', evidence: 'e', origin: 'captain_gesture', at: AT }),
  );
  assert.equal(state.get('d1').status, 'repaid');
});

test('витрина DEBTS.md — легаси-формат: blocks_open → open, repaid/parked → settled', () => {
  const state = play(
    (s) => birthVerb(s, { id: 'a', debt: 'x', evidence: 'e', origin: 'carry', at: AT }),
    (s) => birthVerb(s, { id: 'b', debt: 'y', evidence: 'e', origin: 'carry', at: AT }),
    (s) => parkVerb(s, { id: 'b', at: AT }),
  );
  const md = renderLegacySnapshot(state);
  assert.match(md, /\| a \| x \| e \| open \|/u);
  assert.match(md, /\| b \| y \| e \| settled \|/u);
});

test('миграция легаси-таблицы: open → birth, settled → birth+repay(fact_ref legacy)', () => {
  const events = migrationEvents(
    [
      { id: 'old-open', debt: 'x', evidence: 'e', status: 'open', date: '2026-07-25', theme: 't' },
      { id: 'old-done', debt: 'y', evidence: 'e', status: 'settled', date: '2026-07-25', theme: '' },
    ],
    AT,
  );
  const state = foldLedger(events);
  assert.equal(state.get('old-open').status, 'open');
  assert.equal(state.get('old-done').status, 'repaid');
  assert.match(state.get('old-done').factRef, /legacy/u);
});
