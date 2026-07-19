import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMint } from './truth.mjs';

const baseRegistry = () => ({
  tokens: [
    {
      id: 'existing-owner',
      claim: 'Владелец сказал X',
      class: 'owner',
      parents: [],
      status: 'active',
      revocation: { kind: 'owner' },
      source: { kind: 'owner', date: '2026-07-18', utterance: { sessionId: 's', uuid: 'u', timestamp: 't', kind: 'free-text', quote: 'X' } },
    },
  ],
});

const validDerived = () => ({
  id: 'new-derived',
  claim: 'Из X следует Y',
  class: 'derived',
  parents: ['existing-owner'],
  revocation: { kind: 'parents' },
  source: { kind: 'deduction', premisesUsed: ['existing-owner'] },
});

test('happy path: валидный derived проходит, дефолты писателя проставлены', () => {
  const { errors, token } = validateMint(baseRegistry(), validDerived());
  assert.deepEqual(errors, []);
  assert.equal(token.status, 'active');
});

test('дубль id — отказ', () => {
  const { errors } = validateMint(baseRegistry(), { ...validDerived(), id: 'existing-owner' });
  assert.ok(errors.some((e) => e.includes('дубль id')));
});

test('контрабанда: премисса вне parents режется ЯДРОМ (I3), не дублем логики', () => {
  const t = validDerived();
  t.source.premisesUsed = ['existing-owner', 'smuggled-premise'];
  const { errors } = validateMint(baseRegistry(), t);
  assert.ok(errors.some((e) => e.includes('I3')), `ожидали I3, получили: ${errors.join('; ')}`);
});

test('висячий parent — отказ (I2 через ядро)', () => {
  const t = validDerived();
  t.parents = ['ghost-token'];
  t.source.premisesUsed = ['ghost-token'];
  const { errors } = validateMint(baseRegistry(), t);
  assert.ok(errors.some((e) => e.includes('I2')), `ожидали I2, получили: ${errors.join('; ')}`);
});

test('старый долг реестра не приписывается новому токену', () => {
  const registry = baseRegistry();
  // Реестр УЖЕ содержит битый токен с висячим parent — это не вина нового.
  registry.tokens.push({
    id: 'old-debt',
    claim: 'старый долг',
    class: 'derived',
    parents: ['ghost'],
    status: 'active',
    revocation: { kind: 'parents' },
    source: { kind: 'deduction', premisesUsed: ['ghost'] },
  });
  const { errors } = validateMint(registry, validDerived());
  assert.deepEqual(errors, []);
});

test('owner без указателя на волеизъявление — warning, не отказ (I7)', () => {
  const { errors, warnings } = validateMint(baseRegistry(), {
    id: 'weak-owner',
    claim: 'Владелец сказал Y',
    class: 'owner',
    revocation: { kind: 'owner' },
    source: { kind: 'owner', date: '2026-07-19' },
  });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('волеизъявление')));
});

test('форма: не kebab-case id, пустой claim, кривой class, нет revocation — отказ', () => {
  const { errors } = validateMint(baseRegistry(), { id: 'Bad_Id', claim: ' ', class: 'guess' });
  assert.ok(errors.some((e) => e.includes('kebab-case')));
  assert.ok(errors.some((e) => e.includes('claim')));
  assert.ok(errors.some((e) => e.includes('owner|derived')));
  assert.ok(errors.some((e) => e.includes('revocation')));
});
