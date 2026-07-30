import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  approveEveningPartnerDraft,
  canSendEveningPartnerSwallow,
  recordEveningPartnerDraft,
} from './lib/evening-gates.mjs';

const DAY = '2026-07-30';

test('recordEveningPartnerDraft: пишет вечерний gate marker, digest и сбрасывает старый ack', () => {
  const state = recordEveningPartnerDraft(
    { day: DAY, swallow: { ownerAck: true, draftDigest: 'old' } },
    { draftText: 'вечерний текст', draftFile: 'docs/comms/drafts/swallow-evening.md', today: DAY },
  );
  assert.equal(state.day, DAY);
  assert.equal(state.swallow.gate, 'evening:partner-swallow');
  assert.equal(state.swallow.draftFile, 'docs/comms/drafts/swallow-evening.md');
  assert.equal(state.swallow.ownerAck, false);
  assert.notEqual(state.swallow.draftDigest, 'old');
});

test('approveEveningPartnerDraft: без свежего draft даёт STOP-причины', () => {
  const stale = approveEveningPartnerDraft({ day: '2026-07-29', swallow: { draftDigest: 'x' } }, DAY);
  assert.equal(stale.ok, false);
  assert.match(stale.blockedBy.join(' '), /day:/u);

  const missing = approveEveningPartnerDraft({ day: DAY, swallow: {} }, DAY);
  assert.equal(missing.ok, false);
  assert.match(missing.blockedBy.join(' '), /partner-swallow/u);

  const borrowedMorning = approveEveningPartnerDraft({ day: DAY, swallow: { draftDigest: 'x' } }, DAY);
  assert.equal(borrowedMorning.ok, false);
  assert.match(borrowedMorning.blockedBy.join(' '), /вечернюю дверь/u);
});

test('canSendEveningPartnerSwallow: день + ack + digest; без magistral', () => {
  const draft = 'готовый вечерний текст';
  const state = approveEveningPartnerDraft(
    recordEveningPartnerDraft({}, { draftText: draft, draftFile: 'draft.md', today: DAY }),
    DAY,
  ).state;

  assert.equal(canSendEveningPartnerSwallow(state, DAY, draft).ok, true);

  const mismatch = canSendEveningPartnerSwallow(state, DAY, 'другой текст');
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.blockedBy.join(' '), /evening:gate partner-swallow/u);
});

test('canSendEveningPartnerSwallow: свежий утренний ack не открывает вечер', () => {
  const borrowed = {
    day: DAY,
    swallow: { ownerAck: true, draftDigest: 'abc', draftFile: 'docs/comms/drafts/swallow-day.md' },
  };
  const gate = canSendEveningPartnerSwallow(borrowed, DAY, 'anything');
  assert.equal(gate.ok, false);
  assert.match(gate.blockedBy.join(' '), /evening:gate partner-swallow --draft/u);
});
