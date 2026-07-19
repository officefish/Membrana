import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  SWALLOW_EXIT_UNKNOWN,
  computeDeliveryKey,
  latestStatus,
  recordDelivery,
} from './lib/swallow-delivery-ledger.mjs';
import {
  classifySwallowTransportError,
  resolveSwallowText,
  sendSwallow,
} from './telegram-swallow.mjs';

test('resolveSwallowText: позиционные аргументы склеиваются в текст', () => {
  assert.equal(resolveSwallowText(['Первая', 'новость', '--dry-run']), 'Первая новость');
  assert.equal(resolveSwallowText(['  однострочник  ']), 'однострочник');
});

test('resolveSwallowText: --file читает md (обе формы флага)', () => {
  const readFile = (path) => {
    assert.ok(String(path).replaceAll('\\', '/').endsWith('docs/comms/drafts/note.md'));
    return '**Из файла**\n';
  };
  assert.equal(resolveSwallowText(['--file', 'docs/comms/drafts/note.md'], readFile), '**Из файла**');
  assert.equal(resolveSwallowText(['--file=docs/comms/drafts/note.md'], readFile), '**Из файла**');
});

test('resolveSwallowText: пусто → пустая строка (main даст usage + exit 1)', () => {
  assert.equal(resolveSwallowText([]), '');
  assert.equal(resolveSwallowText(['--dry-run']), '');
});

test('computeDeliveryKey: trim + стабильный sha256', () => {
  const a = computeDeliveryKey('  hello\r\nworld  ');
  const b = computeDeliveryKey('hello\nworld');
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(computeDeliveryKey('hello\nworld'), computeDeliveryKey('other'));
});

test('classifySwallowTransportError: timeout → unknown, иначе failed', () => {
  assert.equal(classifySwallowTransportError(Object.assign(new Error('x'), { name: 'TimeoutError' })), 'unknown');
  assert.equal(classifySwallowTransportError(new Error('The operation was aborted due to timeout')), 'unknown');
  assert.equal(classifySwallowTransportError(new Error('ECONNREFUSED')), 'failed');
});

test('sendSwallow: повтор после delivered → skip (не зовёт fetch)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'swallow-ledger-'));
  const ledgerPath = join(dir, 'ledger.jsonl');
  const key = computeDeliveryKey('одна и та же ласточка');
  recordDelivery(ledgerPath, { key, status: 'delivered', messageId: '42' });
  let fetches = 0;
  const result = await sendSwallow({
    text: 'одна и та же ласточка',
    ledgerPath,
    token: 't',
    fetchImpl: async () => {
      fetches += 1;
      return { ok: true, json: async () => ({ sent: true }) };
    },
  });
  assert.equal(result.outcome, 'skipped-delivered');
  assert.equal(result.exitCode, 0);
  assert.equal(fetches, 0);
  rmSync(dir, { recursive: true, force: true });
});

test('sendSwallow: таймаут → unknown exit 3, не «office недоступен» как факт', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'swallow-ledger-'));
  const ledgerPath = join(dir, 'ledger.jsonl');
  const result = await sendSwallow({
    text: 'таймаут-кейс',
    ledgerPath,
    token: 't',
    fetchImpl: async () => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    },
  });
  assert.equal(result.outcome, 'unknown');
  assert.equal(result.exitCode, SWALLOW_EXIT_UNKNOWN);
  assert.match(result.message, /статус неизвестен/);
  assert.equal(latestStatus(ledgerPath, computeDeliveryKey('таймаут-кейс')).status, 'unknown');
  assert.ok(!/office недоступен/.test(result.message));
  rmSync(dir, { recursive: true, force: true });
});

test('sendSwallow: успех пишет delivered в ledger', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'swallow-ledger-'));
  const ledgerPath = join(dir, 'ledger.jsonl');
  const result = await sendSwallow({
    text: 'ok-кейс',
    ledgerPath,
    token: 't',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ sent: true, message_id: 99 }),
    }),
  });
  assert.equal(result.outcome, 'delivered');
  assert.equal(result.exitCode, 0);
  assert.equal(latestStatus(ledgerPath, computeDeliveryKey('ok-кейс')).status, 'delivered');
  assert.match(readFileSync(ledgerPath, 'utf8'), /delivered/);
  rmSync(dir, { recursive: true, force: true });
});

test('sendSwallow: --force после delivered снова шлёт', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'swallow-ledger-'));
  const ledgerPath = join(dir, 'ledger.jsonl');
  const key = computeDeliveryKey('force-кейс');
  recordDelivery(ledgerPath, { key, status: 'delivered' });
  let fetches = 0;
  const result = await sendSwallow({
    text: 'force-кейс',
    force: true,
    ledgerPath,
    token: 't',
    fetchImpl: async () => {
      fetches += 1;
      return { ok: true, json: async () => ({ sent: true }) };
    },
  });
  assert.equal(result.outcome, 'delivered');
  assert.equal(fetches, 1);
  rmSync(dir, { recursive: true, force: true });
});
