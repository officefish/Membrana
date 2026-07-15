/**
 * Тесты чистых частей _ssh-office-exec / _ssh-panel-smoke.
 *
 * Главная ценность — гард дрейфа: owner-cookie смоука чеканится копией формата
 * panel-auth-core. Если ядро сменит формат подписи, смоук молча начнёт получать
 * 404 «как будто не owner», и это спишут на прод. Тест сверяет токен с СОБРАННЫМ
 * ядром office и падает на расхождении.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

import { buildScriptCommand, normalizeArgv, stripCarriageReturns } from './_ssh-office-exec.mjs';
import { PANEL_SESSION_COOKIE, codePrefix, mintOwnerToken, ownerCookieHeader } from './_ssh-panel-smoke.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_DIST = resolve(ROOT, 'packages/background-office/dist/modules/panel-auth/panel-auth-core.js');

// ─── _ssh-office-exec: подготовка скрипта к запуску на VDS ────────────────────────

test('stripCarriageReturns снимает CRLF (иначе bash падает на $\\r)', () => {
  assert.equal(stripCarriageReturns('#!/bin/bash\r\necho ok\r\n'), '#!/bin/bash\necho ok\n');
});

test('stripCarriageReturns не трогает LF-файл и одиночный CR внутри строки', () => {
  assert.equal(stripCarriageReturns('echo ok\n'), 'echo ok\n');
  assert.equal(stripCarriageReturns("echo 'a\rb'\n"), "echo 'a\rb'\n");
});

test('buildScriptCommand квотит аргументы (пробелы, кавычки, подстановки)', () => {
  assert.equal(
    buildScriptCommand('/tmp/x.sh', ['две слова', "it's", '$(whoami)']),
    "bash /tmp/x.sh 'две слова' 'it'\\''s' '$(whoami)'",
  );
});

test('buildScriptCommand без аргументов', () => {
  assert.equal(buildScriptCommand('/tmp/x.sh'), 'bash /tmp/x.sh');
});

test('normalizeArgv отбрасывает ведущий -- (yarn 4 съедает его сам)', () => {
  assert.deepEqual(normalizeArgv(['--', 'docker ps']), ['docker ps']);
  assert.deepEqual(normalizeArgv(['docker ps']), ['docker ps']);
  // '--' дальше по списку — это аргумент скрипта, не наш разделитель.
  assert.deepEqual(normalizeArgv(['--script', 'a.sh', '--', '-v']), ['--script', 'a.sh', '--', '-v']);
});

// ─── _ssh-panel-smoke: owner-cookie ───────────────────────────────────────────────

test('mintOwnerToken — фиксированный вектор (формат b64url(payload).b64url(hmac))', () => {
  const token = mintOwnerToken('test-secret', 'smoke-owner', 1_800_000_000);
  const [body, mac] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')), {
    kind: 'session',
    role: 'owner',
    sub: 'smoke-owner',
    exp: 1_800_000_000,
  });
  assert.match(mac, /^[\w-]{43}$/, 'HMAC-SHA256 в base64url без паддинга');
  assert.equal(token, mintOwnerToken('test-secret', 'smoke-owner', 1_800_000_000), 'детерминирован');
});

test('mintOwnerToken: другой секрет → другая подпись при том же payload', () => {
  const a = mintOwnerToken('secret-a', 'x', 1_800_000_000);
  const b = mintOwnerToken('secret-b', 'x', 1_800_000_000);
  assert.equal(a.split('.')[0], b.split('.')[0]);
  assert.notEqual(a.split('.')[1], b.split('.')[1]);
});

test('ownerCookieHeader кладёт токен под именем cookie панели', () => {
  const header = ownerCookieHeader('s', 'sub', 300, 1_000_000);
  assert.ok(header.startsWith(`${PANEL_SESSION_COOKIE}=`));
  assert.equal(header, `${PANEL_SESSION_COOKIE}=${mintOwnerToken('s', 'sub', 1_000_300)}`);
});

test('codePrefix не пускает промокод в лог целиком', () => {
  assert.equal(codePrefix('abcdefghijklmn'), 'abcdef…');
});

// Гард дрейфа. Ядро — TS, поэтому сверяемся с dist; без сборки office тест
// пропускается (а не врёт зелёным) — dist собирает `yarn office:build`.
test('owner-cookie принимается НАСТОЯЩИМ ядром panel-auth (гард дрейфа)', async (t) => {
  if (!existsSync(CORE_DIST)) {
    t.skip('нет packages/background-office/dist — сначала yarn office:build');
    return;
  }
  const core = await import(pathToFileURL(CORE_DIST).href);
  const nowSec = 1_000_000;
  const identity = core.resolveIdentity(ownerCookieHeader('live-secret', 'smoke-owner', 300, nowSec), 'live-secret', nowSec);
  assert.equal(identity.role, 'owner', 'ядро должно признать токен смоука owner-сессией');
  assert.equal(identity.sub, 'smoke-owner');
  assert.equal(PANEL_SESSION_COOKIE, core.PANEL_SESSION_COOKIE, 'имя cookie разъехалось с ядром');
});

test('протухший owner-cookie ядро отвергает (TTL реально работает)', async (t) => {
  if (!existsSync(CORE_DIST)) {
    t.skip('нет packages/background-office/dist — сначала yarn office:build');
    return;
  }
  const core = await import(pathToFileURL(CORE_DIST).href);
  const header = ownerCookieHeader('live-secret', 'smoke-owner', 300, 1_000_000);
  assert.equal(core.resolveIdentity(header, 'live-secret', 1_000_301).role, 'public');
});
