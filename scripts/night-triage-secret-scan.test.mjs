import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  scanJsonForSensitiveKeys,
  scanRoutineReadPaths,
  scanTextForSecrets,
  parseScanRedactCli,
  runScanRedact,
} from './night-triage-secret-scan.mjs';

test('scanTextForSecrets: чистый markdown — ноль находок', () => {
  const text = '# README\n\nРеестр задач: active/archived. Ключевые слова без значений.';
  assert.deepEqual(scanTextForSecrets(text, 'docs/tasks/README.md'), []);
});

test('scanTextForSecrets: ловит распространённые форматы ключей', () => {
  const cases = [
    ['sk-ant-api03-abcdefghijklmnop', 'anthropic-key'],
    ['ghp_ABCDEFGHIJKLMNOPQRSTUVWX', 'github-token'],
    ['AKIAIOSFODNN7EXAMPLE', 'aws-access-key'],
    ['xoxb-1234567890-abcdef', 'slack-token'],
    ['-----BEGIN RSA PRIVATE KEY-----', 'private-key-pem'],
    ['postgres://admin:demo12345@db.internal:5432/app', 'basic-auth-url'],
  ];
  for (const [payload, kind] of cases) {
    const findings = scanTextForSecrets(`text before ${payload} after`, 'f.md');
    assert.ok(
      findings.some((f) => f.kind === kind),
      `ожидали ${kind} в «${payload}», получили ${JSON.stringify(findings)}`,
    );
  }
});

test('scanJsonForSensitiveKeys: непустой token — находка, null/пустая строка — нет', () => {
  const clean = { tasks: [{ id: 'x', linearId: null, apiToken: '', notes: 'token обсуждали' }] };
  assert.deepEqual(scanJsonForSensitiveKeys(clean, 'r.json'), []);

  const dirty = { tasks: [{ id: 'x', apiToken: 'v1.abcdef' }] };
  const findings = scanJsonForSensitiveKeys(dirty, 'r.json');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'sensitive-json-key');
  assert.match(findings[0].detail, /apiToken/u);
});

test('scanRoutineReadPaths: чистый срез — exit-ok, подсаженный токен — блок', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'nt-scan-'));
  mkdirSync(join(cwd, 'docs', 'tasks'), { recursive: true });
  const paths = ['docs/tasks/registry.json', 'docs/tasks/README.md'];

  writeFileSync(join(cwd, 'docs', 'tasks', 'registry.json'), JSON.stringify({ tasks: [{ id: 'a' }] }), 'utf8');
  writeFileSync(join(cwd, 'docs', 'tasks', 'README.md'), '# Регламент\n', 'utf8');
  assert.deepEqual(scanRoutineReadPaths(cwd, paths), []);

  writeFileSync(join(cwd, 'docs', 'tasks', 'README.md'), 'приватный ghp_ABCDEFGHIJKLMNOPQRSTUVWX\n', 'utf8');
  const findings = scanRoutineReadPaths(cwd, paths);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'github-token');
});

test('scanRoutineReadPaths: отсутствующий файл чтения — тоже находка (read-error)', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'nt-scan-'));
  const findings = scanRoutineReadPaths(cwd, ['docs/tasks/registry.json']);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'read-error');
});

test('--redact (веха secret-parser-built): копия без ключа, манифест с датой и счётчиком, вход не тронут', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'nt-redact-'));
  const dirty = 'до\nANTHROPIC_API_KEY=sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nпосле\n';
  writeFileSync(join(cwd, 'dirty.txt'), dirty, 'utf8');
  const o = parseScanRedactCli(['--redact', 'dirty.txt', '--out', 'clean.txt', '--manifest', 'manifest.md', '--date', '2026-08-20']);
  const res = runScanRedact(o, cwd);
  assert.equal(res.cuts, 1);
  const clean = readFileSync(join(cwd, 'clean.txt'), 'utf8');
  assert.ok(!clean.includes('sk-ant-'), 'ключ вырезан из копии');
  assert.ok(clean.includes('до\n'), 'нетронутый текст сохранён');
  assert.equal(readFileSync(join(cwd, 'dirty.txt'), 'utf8'), dirty, 'вход байт в байт не тронут');
  const manifest = readFileSync(join(cwd, 'manifest.md'), 'utf8');
  assert.ok(manifest.includes('2026-08-20'), 'манифест датирован');
  assert.ok(manifest.includes('Вырезано фрагментов: 1'), 'манифест несёт счётчик');
  assert.ok(!manifest.includes('sk-ant-'), 'манифест не содержит вырезанных значений');
});

test('--redact: --out совпадает со входом — отказ (вход не перезаписывается)', () => {
  assert.throws(() => parseScanRedactCli(['--redact', 'x.txt', '--out', 'x.txt']), /не перезаписывается/u);
});
