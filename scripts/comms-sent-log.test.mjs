import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  appendSentLog,
  hashSentPayload,
  hasSentRecord,
  redactOfficeResponse,
} from './lib/comms-sent-log.mjs';
import { computeDeliveryKey, latestStatus } from './lib/swallow-delivery-ledger.mjs';
import { sendSwallow } from './telegram-swallow.mjs';

test('hashSentPayload: стабилен и trim', () => {
  assert.equal(hashSentPayload('  a\r\nb  '), hashSentPayload('a\nb'));
  assert.match(hashSentPayload('x'), /^[a-f0-9]{64}$/);
});

test('redactOfficeResponse: только sent + message_id', () => {
  assert.deepEqual(redactOfficeResponse({ sent: true, message_id: 7, text: 'SECRET' }), {
    sent: true,
    message_id: 7,
  });
  assert.deepEqual(redactOfficeResponse({ sent: false }), { sent: false });
});

test('appendSentLog + hasSentRecord: предикат по sha256', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sent-log-'));
  const logPath = join(dir, 'sent-log.jsonl');
  const sha = hashSentPayload('ласточка Алексу');
  appendSentLog(logPath, {
    kind: 'swallow',
    file: 'docs/comms/drafts/alex-response-swallow.md',
    sha256: sha,
    sent: true,
    office_response: { sent: true, message_id: 1 },
  });
  assert.equal(hasSentRecord(logPath, { sha256: sha }), true);
  assert.equal(hasSentRecord(logPath, { sha256: sha, kind: 'swallow' }), true);
  assert.equal(hasSentRecord(logPath, { sha256: sha, kind: 'digest' }), false);
  assert.equal(hasSentRecord(logPath, { sha256: hashSentPayload('другое') }), false);
  const row = JSON.parse(readFileSync(logPath, 'utf8').trim());
  assert.equal(row.file, 'docs/comms/drafts/alex-response-swallow.md');
  assert.ok(!JSON.stringify(row).includes('ласточка'));
  rmSync(dir, { recursive: true, force: true });
});

test('sendSwallow: delivered пишет sent-log; dry path не зовётся здесь', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'swallow-sent-'));
  const ledgerPath = join(dir, 'ledger.jsonl');
  const sentLogPath = join(dir, 'sent-log.jsonl');
  const text = 'ok для sent-log';
  const result = await sendSwallow({
    text,
    ledgerPath,
    sentLogPath,
    sourceFile: 'docs/comms/drafts/note.md',
    token: 't',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ sent: true, message_id: 42 }),
    }),
  });
  assert.equal(result.outcome, 'delivered');
  assert.equal(hasSentRecord(sentLogPath, { sha256: hashSentPayload(text), kind: 'swallow' }), true);
  assert.equal(latestStatus(ledgerPath, computeDeliveryKey(text))?.status, 'delivered');
  rmSync(dir, { recursive: true, force: true });
});

test('sendSwallow: sentLogPath=null — не пишет журнал (#585 opt-out в тестах)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'swallow-nolog-'));
  const ledgerPath = join(dir, 'ledger.jsonl');
  const sentLogPath = join(dir, 'would-not.jsonl');
  await sendSwallow({
    text: 'без лога',
    ledgerPath,
    sentLogPath: null,
    token: 't',
    fetchImpl: async () => ({ ok: true, json: async () => ({ sent: true }) }),
  });
  assert.equal(hasSentRecord(sentLogPath, { sha256: hashSentPayload('без лога') }), false);
  rmSync(dir, { recursive: true, force: true });
});
