import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getOfficeSshConfig,
  getOfficeDomain,
  renderOfficeCaddyfile,
} from './_ssh-office-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('getOfficeSshConfig reads BACKGROUND_OFFICE_* keys', () => {
  const env = 'BACKGROUND_OFFICE_IPV4=10.0.0.5\nBACKGROUND_OFFICE_PASSWORD=secret\n';
  const cfg = getOfficeSshConfig(env);
  assert.equal(cfg.host, '10.0.0.5');
  assert.equal(cfg.password, 'secret');
  assert.equal(cfg.username, 'root');
});

test('getOfficeSshConfig does NOT fall back to BACKGROUND_MEDIA_* (#349)', () => {
  const env = 'BACKGROUND_MEDIA_IPV4=72.56.27.58\nBACKGROUND_MEDIA_PASSWORD=old\n';
  assert.throws(() => getOfficeSshConfig(env), /BACKGROUND_OFFICE_IPV4/);
});

test('getOfficeDomain requires OFFICE_DOMAIN, no stale default', () => {
  assert.equal(getOfficeDomain('OFFICE_DOMAIN=office.example.com\n'), 'office.example.com');
  assert.throws(() => getOfficeDomain('OTHER=1\n'), /OFFICE_DOMAIN/);
});

test('renderOfficeCaddyfile substitutes domain into template', () => {
  const template = readFileSync(resolve(root, 'deploy/Caddyfile.office.template'), 'utf8');
  const rendered = renderOfficeCaddyfile(template, 'office.example.com');
  assert.ok(rendered.includes('office.example.com {'));
  assert.ok(!rendered.includes('{{'));
  assert.ok(rendered.includes('reverse_proxy 127.0.0.1:3000'));
});

test('renderOfficeCaddyfile throws on unresolved placeholder', () => {
  assert.throws(() => renderOfficeCaddyfile('{{OTHER}} {}', 'x'), /плейсхолдер/);
});
