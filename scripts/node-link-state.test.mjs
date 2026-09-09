import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EXIT_NOT_LIVE, EXIT_OK, EXIT_REFUSED, exitCodeFor, judgeNode } from './node-link-state.mjs';

const NOW = Date.parse('2026-09-06T12:00:00.000Z');
const H = 3600_000;
const node = (over = {}) => ({
  id: 'ad6975f1-0000-4000-8000-000000000001',
  name: 'Узел 1',
  accessKeys: [{ id: '77004e50-0000-4000-8000-000000000002', duration: 'weeks_2', expiresAt: new Date(NOW + 72 * H).toISOString(), revokedAt: null }],
  device: { pairingStatus: 'paired', pairedKeyId: '77004e50-0000-4000-8000-000000000002', pairedKeyExpiresAt: new Date(NOW + 72 * H).toISOString(), lastSeenAt: '2026-09-05T21:40:17.695Z' },
  ...over,
});

test('#2284 живой ключ и сопряжение — ok, exit 0', () => {
  const r = judgeNode(node(), { now: NOW, link: { paired: true, live: false, lastSeenAt: '2026-09-05T21:40:17.695Z' } });
  assert.equal(r.verdict, 'ok');
  assert.equal(r.remedy, null);
  assert.equal(exitCodeFor([r.verdict]), EXIT_OK);
});

test('#2284 ПОРЧА: ключ 20.08 с истечением 03.09 — expired, лекарство названо, exit 27', () => {
  // Ровно снимок приёмки 20.08 («истекает 03.09»), поданный живому суду 06.09.
  const exp = '2026-09-03T11:06:00.000Z';
  const r = judgeNode(node({ accessKeys: [{ id: '77004e50-x', duration: 'weeks_2', expiresAt: exp, revokedAt: null }], device: { pairingStatus: 'paired', pairedKeyId: '77004e50-x', pairedKeyExpiresAt: exp } }), { now: NOW });
  assert.equal(r.verdict, 'expired');
  assert.match(r.lines.at(-1), /ИСТЁК/u);
  assert.match(r.remedy, /новый ключ/u);
  assert.equal(exitCodeFor([r.verdict]), EXIT_NOT_LIVE);
});

test('#2284 осталось меньше суток — expiring: дежурство не переживёт', () => {
  const exp = new Date(NOW + 5 * H).toISOString();
  const r = judgeNode(node({ accessKeys: [{ id: 'k', duration: 'hours_4', expiresAt: exp, revokedAt: null }], device: { pairingStatus: 'paired', pairedKeyId: 'k', pairedKeyExpiresAt: exp } }), { now: NOW });
  assert.equal(r.verdict, 'expiring');
  assert.equal(exitCodeFor([r.verdict]), EXIT_NOT_LIVE);
});

test('#2284 отозванный ключ — revoked; ключа нет — no-key', () => {
  const revoked = judgeNode(node({ accessKeys: [{ id: 'k', expiresAt: new Date(NOW + 72 * H).toISOString(), revokedAt: '2026-09-04T00:00:00.000Z' }], device: { pairingStatus: 'paired', pairedKeyId: 'k' } }), { now: NOW });
  assert.equal(revoked.verdict, 'revoked');
  const none = judgeNode({ id: 'n', name: 'Узел', accessKeys: [], device: null }, { now: NOW });
  assert.equal(none.verdict, 'no-key');
});

test('#2284 ключ жив, но связка снята — not-paired (link-state главнее снимка device)', () => {
  const r = judgeNode(node(), { now: NOW, link: { paired: false, live: false, lastSeenAt: null } });
  assert.equal(r.verdict, 'not-paired');
});

test('#2284 неизвестная форма ответа — unknown и ОТКАЗ, а не молчаливое «ok»', () => {
  const r = judgeNode({ id: 'n', name: 'Узел' }, { now: NOW });
  assert.equal(r.verdict, 'unknown');
  assert.equal(exitCodeFor(['ok', 'unknown']), EXIT_REFUSED, 'один неснятый узел отравляет ноль');
  assert.equal(exitCodeFor([]), EXIT_REFUSED, 'нет узлов — не успех');
});
