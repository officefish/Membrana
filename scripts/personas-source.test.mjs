/**
 * Tooth for #2542: full persona rosters come from voices.registry.json through
 * scripts/lib/personas.mjs. Named filters are legal; full handwritten copies are not.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { CONSILIUM_ROLE_KEY_TO_SLUG } from './lib/persona-memory.mjs';
import { loadKnownPersonaIds } from './lib/personas.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsRoot = join(repoRoot, 'scripts');
const voiceIds = [...loadKnownPersonaIds()].sort();
const fullRoster = voiceIds.join('\0');
const fullRosterWithHuman = [...voiceIds, 'human'].sort().join('\0');

const SKIP_FILES = new Set([
  'scripts/personas-source.test.mjs',
]);

function walkMjs(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walkMjs(abs));
    else if (entry.endsWith('.mjs')) out.push(abs);
  }
  return out;
}

function stringLiterals(text) {
  return [...String(text).matchAll(/'([^']+)'|"([^"]+)"/gu)].map((m) => m[1] ?? m[2]);
}

function objectKeys(text) {
  return [...String(text).matchAll(/^\s*([a-z][a-z0-9-]*)\s*:/gmu)].map((m) => m[1]);
}

function candidateLists(text) {
  const out = [];
  for (const m of text.matchAll(/(?:export\s+)?const\s+([A-Z0-9_]+)\s*=\s*(?:Object\.freeze\()?(\[[\s\S]*?\])\)?\s*;/gu)) {
    out.push({ symbol: m[1], values: stringLiterals(m[2]) });
  }
  for (const m of text.matchAll(/(?:export\s+)?const\s+([A-Z0-9_]+)\s*=\s*new Set\((\[[\s\S]*?\])\)\s*;/gu)) {
    out.push({ symbol: m[1], values: stringLiterals(m[2]) });
  }
  for (const m of text.matchAll(/(?:export\s+)?const\s+([A-Z0-9_]+)\s*=\s*\{([\s\S]*?)\};/gu)) {
    out.push({ symbol: m[1], values: objectKeys(m[2]) });
  }
  return out;
}

function isFullRoster(values) {
  const ids = [...new Set(values.filter((v) => voiceIds.includes(v) || v === 'human'))].sort();
  const key = ids.join('\0');
  return key === fullRoster || key === fullRosterWithHuman;
}

test('consilium role memory maps Teamlead to tarasov and Architect to vesnin', () => {
  assert.equal(CONSILIUM_ROLE_KEY_TO_SLUG.teamlead, 'tarasov');
  assert.equal(CONSILIUM_ROLE_KEY_TO_SLUG.architect, 'vesnin');
});

test('scripts do not carry handwritten full persona rosters outside the source reader', () => {
  const findings = [];
  for (const abs of walkMjs(scriptsRoot)) {
    const rel = relative(repoRoot, abs).replace(/\\/g, '/');
    if (SKIP_FILES.has(rel)) continue;
    const text = readFileSync(abs, 'utf8');
    for (const c of candidateLists(text)) {
      if (isFullRoster(c.values)) findings.push(`${rel}:${c.symbol}`);
    }
  }
  assert.deepEqual(
    findings,
    [],
    `полный ростер персон должен идти из scripts/lib/personas.mjs, ручные дубли: ${findings.join(', ')}`,
  );
});
