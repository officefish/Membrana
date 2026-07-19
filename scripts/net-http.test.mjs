import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyHttpProbe, maskProxy } from './net-http.mjs';

test('ok: 2xx и 3xx', () => {
  assert.equal(classifyHttpProbe({ status: 200, bodyText: '{}' }).cls, 'ok');
  assert.equal(classifyHttpProbe({ status: 301, bodyText: '' }).cls, 'ok');
  assert.equal(classifyHttpProbe({ status: 200 }).exit, 0);
});

test('geo-403: 403 сильнее HTML-тела', () => {
  const r = classifyHttpProbe({ status: 403, bodyText: '<!DOCTYPE html><html>blocked</html>' });
  assert.equal(r.cls, 'geo-403');
  assert.equal(r.exit, 4);
});

test('waf-html: не-2xx с HTML-телом', () => {
  const r = classifyHttpProbe({ status: 503, bodyText: '<html>Just a moment...</html>' });
  assert.equal(r.cls, 'waf-html');
  assert.equal(r.exit, 5);
});

test('timeout: connect/headers/abort', () => {
  assert.equal(classifyHttpProbe({ error: { code: 'UND_ERR_CONNECT_TIMEOUT' } }).cls, 'timeout');
  assert.equal(classifyHttpProbe({ error: { message: 'TimeoutError: signal timed out' } }).exit, 2);
});

test('proxy-dead: сокет не открылся', () => {
  assert.equal(classifyHttpProbe({ error: { code: 'ECONNREFUSED' } }).cls, 'proxy-dead');
  assert.equal(classifyHttpProbe({ error: { code: 'UND_ERR_SOCKET' } }).exit, 3);
});

test('остальное честно названо: http-<status> и net-error', () => {
  assert.equal(classifyHttpProbe({ status: 429, bodyText: '{"error":"rate"}' }).cls, 'http-429');
  assert.equal(classifyHttpProbe({ status: 500, bodyText: 'oops' }).exit, 1);
  assert.equal(classifyHttpProbe({ error: { code: 'ENOTFOUND' } }).cls, 'net-error');
});

test('maskProxy: креды маскируются, чистый URL не искажается', () => {
  assert.equal(maskProxy('http://user:secret@10.0.0.1:3128'), 'http://user:***@10.0.0.1:3128');
  assert.equal(maskProxy('http://10.0.0.1:3128'), 'http://10.0.0.1:3128');
  assert.equal(maskProxy(''), '(без прокси)');
});
