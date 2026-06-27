import test from 'node:test';
import assert from 'node:assert/strict';

import { checkCodebaseMemoryIndex, resolveCodebaseMemoryBinary, resolveHeadroomBinary } from './lib/context-tooling.mjs';

test('resolveCodebaseMemoryBinary prefers explicit env path', () => {
  const path = resolveCodebaseMemoryBinary('C:/repo', { CODEBASE_MEMORY_MCP_BIN: 'C:/cbm.exe' }, 'win32', (candidate) => candidate === 'C:/cbm.exe');
  assert.equal(path, 'C:/cbm.exe');
});

test('resolveHeadroomBinary finds repo venv binary', () => {
  const path = resolveHeadroomBinary('C:/repo', {}, 'win32', (candidate) => candidate.endsWith('headroom.exe'));
  assert.match(path, /headroom-venv[\\/]Scripts[\\/]headroom\.exe$/u);
});

test('checkCodebaseMemoryIndex is non-blocking when index is absent', () => {
  const result = checkCodebaseMemoryIndex('C:/repo', { env: { CODEBASE_MEMORY_MCP_BIN: 'C:/cbm.exe' }, platform: 'win32', fileExists: () => true, spawn: () => ({ status: 0, stdout: '{"error":"not indexed"}', stderr: '' }) });
  assert.equal(result.ok, false);
  assert.equal(result.skipped, false);
});
