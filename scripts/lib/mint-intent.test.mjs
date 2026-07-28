/**
 * Зуб контракта V3 (M3 DoD п.3): фикстуры ok / нет limit / один proof / не-lead / дубль.
 * Отказы — только из закрытого словаря REJECT_REASONS.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REJECT_REASONS, admitV1, existingThoughtKeysFromRegistry, thoughtKey, tokenFromPacket, validPacket } from './mint-intent.mjs';

const OK_PACKET = {
  tokenId: 'sample-thought-token',
  claim: 'Утверждение для графа.',
  thought: { sessionId: 's-1', uuid: 'u-1', timestamp: '2026-07-28T09:00:00Z', quote: 'сказано вот так', kind: 'user' },
  proofs: [
    { benefit: 'снимает гонку доставки', anchor: 'issue:#1320' },
    { benefit: 'экономит заходы на PR', anchor: 'scripts/pr-verify.mjs' },
  ],
  limit: 'Не сказано, как быть при офлайне.',
  hardness: 'aimed',
  initiatedBy: 'lead',
};

test('фикстура ok: validPacket и admit_v1 проходят', () => {
  assert.deepEqual(validPacket(OK_PACKET), { ok: true });
  assert.deepEqual(admitV1(OK_PACKET, { existingThoughtKeys: new Set() }), { ok: true });
});

test('фикстура «нет limit»: отказ no_triangle — поле «что не сказано» обязательно', () => {
  const r = validPacket({ ...OK_PACKET, limit: '  ' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no_triangle');
});

test('фикстура «один proof»: треугольник не собран', () => {
  const r = validPacket({ ...OK_PACKET, proofs: [OK_PACKET.proofs[0]] });
  assert.equal(r.reason, 'no_triangle');
});

test('два одинаковых proof — не треугольник (proofs_weak)', () => {
  const r = validPacket({ ...OK_PACKET, proofs: [OK_PACKET.proofs[0], { ...OK_PACKET.proofs[0] }] });
  assert.equal(r.reason, 'proofs_weak');
});

test('фикстура «не-lead»: агент не чеканит по усмотрению', () => {
  const r = admitV1({ ...OK_PACKET, initiatedBy: 'agent-fable' }, {});
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'not_lead');
});

test('фикстура «дубль»: та же реплика второй раз не чеканится', () => {
  const r = admitV1(OK_PACKET, { existingThoughtKeys: new Set([thoughtKey(OK_PACKET.thought)]) });
  assert.equal(r.reason, 'duplicate_thought');
});

test('owner пометил потоком → stream_only_by_owner, и это успех контракта', () => {
  const r = admitV1(OK_PACKET, { ownerMarkedStream: true });
  assert.equal(r.reason, 'stream_only_by_owner');
  assert.match(r.detail, /успех/u);
});

test('все отказы — из закрытого словаря', () => {
  const cases = [
    validPacket({}),
    validPacket({ ...OK_PACKET, limit: '' }),
    validPacket({ ...OK_PACKET, hardness: 'очень твёрдо' }),
    admitV1({ ...OK_PACKET, initiatedBy: 'x' }, {}),
  ];
  for (const c of cases) assert.ok(REJECT_REASONS.includes(c.reason), c.reason);
});

test('existingThoughtKeys собираются из utterance-указателей реестра', () => {
  const keys = existingThoughtKeysFromRegistry({ tokens: [{ source: { utterance: { sessionId: 's-1', uuid: 'u-1' } } }, { source: { kind: 'deduction' } }] });
  assert.ok(keys.has('s-1#u-1'));
  assert.equal(keys.size, 1);
});

test('tokenFromPacket: owner-класс, SpeechRef цел, limit уезжает в utterance, отзыв словом владельца', () => {
  const t = tokenFromPacket(OK_PACKET);
  assert.equal(t.class, 'owner');
  assert.equal(t.source.utterance.uuid, 'u-1');
  assert.equal(t.source.utterance.limit, OK_PACKET.limit);
  assert.equal(t.revocation.kind, 'owner');
});
