import assert from 'node:assert/strict';
import test from 'node:test';

import {
  scanDirectProviderCallsInText,
  scanProcedureEntryProviderCalls,
} from './llm-calls-audit.mjs';

test('llm-calls audit flags direct provider calls in procedure entry scripts', () => {
  const hits = scanDirectProviderCallsInText(
    'scripts/ask-persona.mjs',
    'import { anthropicPost } from "./_anthropic-env.mjs";\nawait anthropicPost(url, opts);\n',
  );

  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((hit) => hit.symbol), ['anthropicPost', 'anthropicPost']);
});

test('llm-calls audit allowlists only the facade and provider env modules', () => {
  assert.deepEqual(
    scanDirectProviderCallsInText('scripts/lib/llm-procedure-ritual.mjs', 'anthropicPost(); llmProxyPost();'),
    [],
  );
  assert.deepEqual(
    scanDirectProviderCallsInText('scripts/_anthropic-env.mjs', 'export function anthropicPost() {}'),
    [],
  );
  assert.deepEqual(
    scanDirectProviderCallsInText('scripts/_llm-proxy-env.mjs', 'export function llmProxyPost() {}'),
    [],
  );
});

test('llm-calls audit scans procedure registry entries as one list', () => {
  const registry = {
    procedures: [
      { entryMjs: 'scripts/ask-persona.mjs' },
      { entryMjs: 'scripts/team-evening-feedback.mjs' },
      { entryMjs: 'scripts/lib/llm-procedure-ritual.mjs' },
    ],
  };
  const files = new Map([
    ['scripts/ask-persona.mjs', 'invokeProcedureLlm({ procedureId: "ask" });\n'],
    ['scripts/team-evening-feedback.mjs', 'invokeProcedureLlm({ procedureId: "team-evening-feedback" });\n'],
    ['scripts/lib/llm-procedure-ritual.mjs', 'anthropicPost(); llmProxyPost();\n'],
  ]);

  const hits = scanProcedureEntryProviderCalls({
    registry,
    root: 'repo',
    exists: (absPath) => files.has(absPath.replaceAll('\\', '/').replace(/^.*repo\//u, '')),
    readFile: (absPath) => files.get(absPath.replaceAll('\\', '/').replace(/^.*repo\//u, '')),
  });

  assert.deepEqual(hits, []);
});

test('llm-calls audit current procedure entries have no direct provider calls', () => {
  assert.deepEqual(scanProcedureEntryProviderCalls(), []);
});
