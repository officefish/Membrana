import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('verify-mcp-bootstrap exits 0', () => {
  const res = spawnSync(process.execPath, ['scripts/verify-mcp-bootstrap.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.match(res.stdout, /MCP bootstrap OK/);
});
