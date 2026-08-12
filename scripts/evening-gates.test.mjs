import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  approveEveningPartnerDraft,
  canSendEveningPartnerSwallow,
  claimsProbeBlocker,
  recordEveningPartnerDraft,
} from './lib/evening-gates.mjs';

const DAY = '2026-07-30';

/** Готовое к отправке состояние вечера: день, вечерняя дверь, ack владельца, digest текста. */
const readyState = (draft, extra = {}) => {
  const base = approveEveningPartnerDraft(
    recordEveningPartnerDraft({}, { draftText: draft, draftFile: 'draft.md', today: DAY }),
    DAY,
  ).state;
  return { ...base, swallow: { ...base.swallow, ...extra } };
};

test('recordEveningPartnerDraft: пишет вечерний gate marker, digest и сбрасывает старый ack', () => {
  const state = recordEveningPartnerDraft(
    { day: DAY, swallow: { ownerAck: true, draftDigest: 'old' } },
    { draftText: 'вечерний текст', draftFile: 'docs/comms/drafts/swallow-evening.md', today: DAY },
  );
  // ADR-0024 (swallow-own-moment): момент черновика — СВОЙ (swallow.day); state.day
  // черновик больше не переписывает (входной унаследован спредом как день заморозки).
  assert.equal(state.swallow.day, DAY);
  assert.equal(state.day, DAY, 'входной state.day не переписан, а унаследован спредом');
  assert.equal(state.swallow.gate, 'evening:partner-swallow');
  assert.equal(state.swallow.draftFile, 'docs/comms/drafts/swallow-evening.md');
  assert.equal(state.swallow.ownerAck, false);
  assert.notEqual(state.swallow.draftDigest, 'old');
});

test('approveEveningPartnerDraft: без свежего draft даёт STOP-причины', () => {
  // ADR-0024 (swallow-own-moment): свежесть черновика читается из СВОЕГО момента swallow.day.
  const stale = approveEveningPartnerDraft({ swallow: { day: '2026-07-29', draftDigest: 'x' } }, DAY);
  assert.equal(stale.ok, false);
  assert.match(stale.blockedBy.join(' '), /черновик протух/u);

  const missing = approveEveningPartnerDraft({ swallow: { day: DAY } }, DAY);
  assert.equal(missing.ok, false);
  assert.match(missing.blockedBy.join(' '), /partner-swallow/u);

  const legacyDayOnly = approveEveningPartnerDraft({ day: DAY, swallow: { draftDigest: 'x' } }, DAY);
  assert.equal(legacyDayOnly.ok, false, 'Р4: общий day моментом ласточки не наследуется');
  assert.match(legacyDayOnly.blockedBy.join(' '), /черновик протух/u);

  const borrowedMorning = approveEveningPartnerDraft({ swallow: { day: DAY, draftDigest: 'x' } }, DAY);
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

test('сверка утверждений: hard держит ласточку, soft и unknown — нет', () => {
  const draft = 'готовый вечерний текст';
  const probe = (verdict) => ({
    claimsProbe: { verdict, sha: 'abcdef123456', protocol: 'docs/seanses/team-evening-feedback-2026-07-30.md' },
  });

  const hard = canSendEveningPartnerSwallow(readyState(draft, probe('hard')), DAY, draft);
  assert.equal(hard.ok, false);
  assert.match(hard.blockedBy.join(' '), /НЕ ПОДТВЕРЖДЁННОЕ деревом/u);
  assert.match(hard.blockedBy.join(' '), /feedback:claims --ack/u);

  for (const verdict of ['soft', 'unknown', 'ok']) {
    assert.equal(canSendEveningPartnerSwallow(readyState(draft, probe(verdict)), DAY, draft).ok, true);
  }
});

test('сверка утверждений: квитанция владельца проходит гейт только под ТО ЖЕ дерево', () => {
  const draft = 'готовый вечерний текст';
  const sameTree = {
    claimsProbe: { verdict: 'hard', sha: 'abcdef123456', override: { by: 'owner', sha: 'abcdef123456', note: 'ложная тревога' } },
  };
  assert.equal(canSendEveningPartnerSwallow(readyState(draft, sameTree), DAY, draft).ok, true);

  const otherTree = {
    claimsProbe: { verdict: 'hard', sha: 'newnewnew999', override: { by: 'owner', sha: 'abcdef123456', note: 'вчерашнее «ок»' } },
  };
  const gate = canSendEveningPartnerSwallow(readyState(draft, otherTree), DAY, draft);
  assert.equal(gate.ok, false);
  assert.match(gate.blockedBy.join(' '), /НЕ ПОДТВЕРЖДЁННОЕ деревом/u);
});

test('claimsProbeBlocker: отсутствие сверки ничего не держит — гейта нет, а не «красный»', () => {
  assert.equal(claimsProbeBlocker(undefined), null);
  assert.equal(claimsProbeBlocker({}), null);
  assert.equal(claimsProbeBlocker({ swallow: {} }), null);
  assert.equal(claimsProbeBlocker({ swallow: { claimsProbe: { verdict: 'ok' } } }), null);
});

test('сверка утверждений не читает и не трогает state.day — он предмет соседней карточки', () => {
  const draft = 'текст';
  const state = readyState(draft, { claimsProbe: { verdict: 'hard', sha: 'aaa' } });
  const before = state.day;
  canSendEveningPartnerSwallow(state, DAY, draft);
  assert.equal(state.day, before);
  // Блокировка выносится по одному лишь своему полю: день из решения не участвует.
  assert.ok(claimsProbeBlocker({ swallow: { claimsProbe: { verdict: 'hard', sha: 'aaa' } } }));
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
