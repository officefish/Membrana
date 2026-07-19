import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  buildDigestQuery,
  digestPathForDate,
  parseDigestItems,
  renderDigestMarkdown,
  runResearchDigest,
} from './lib/research-digest.mjs';

test('digestPathForDate', () => {
  assert.ok(digestPathForDate('/repo', '2026-07-19').replace(/\\/g, '/').endsWith('docs/research/digest-2026-07-19.md'));
});

test('buildDigestQuery требует Source и запрещает советы', () => {
  const q = buildDigestQuery('drones', '2026-07-19');
  assert.match(q, /Source:/);
  assert.match(q, /no advice/i);
});

test('parseDigestItems вытаскивает Source', () => {
  const raw = `1. First fact about acoustic UAV detection.
   - Source: https://example.com/a (2026-06-01)
2. Second fact.
   - Source: https://example.com/b (2026-05)
3. Orphan without source — drop me.`;
  const items = parseDigestItems(raw);
  assert.equal(items.length, 2);
  assert.equal(items[0].source, 'https://example.com/a');
  assert.match(items[0].text, /First fact/);
});

test('renderDigestMarkdown — ≤7 и Source под каждым', () => {
  const md = renderDigestMarkdown({
    topic: 't',
    date: '2026-07-19',
    items: [
      { text: 'A', source: 'https://a.example', date: '2026-01-01' },
      { text: 'B', source: 'https://b.example', date: '2026-02-01' },
    ],
  });
  assert.match(md, /Research digest — 2026-07-19/);
  assert.match(md, /Source: https:\/\/a\.example/);
});

test('runResearchDigest: skip если файл есть; dry-run не пишет', async () => {
  const root = mkdtempSync(join(tmpdir(), 'digest-'));
  mkdirSync(join(root, 'docs', 'research'), { recursive: true });
  const path = digestPathForDate(root, '2026-07-19');
  writeFileSync(path, '# existing\n', 'utf8');

  const skipped = await runResearchDigest({
    repoRoot: root,
    apiKey: 'k',
    date: '2026-07-19',
    ask: async () => 'should not call',
  });
  assert.equal(skipped.outcome, 'skipped-exists');

  const dry = await runResearchDigest({
    repoRoot: root,
    apiKey: 'k',
    date: '2026-07-20',
    dryRun: true,
    ask: async () =>
      '1. Fact one.\n   - Source: https://ex.com/1 (2026-07-01)\n2. Fact two.\n   - Source: https://ex.com/2 (2026-07-02)',
  });
  assert.equal(dry.outcome, 'dry-run');
  const { existsSync } = await import('node:fs');
  assert.equal(existsSync(digestPathForDate(root, '2026-07-20')), false);

  const written = await runResearchDigest({
    repoRoot: root,
    apiKey: 'k',
    date: '2026-07-20',
    ask: async () =>
      '1. Fact one.\n   - Source: https://ex.com/1 (2026-07-01)\n2. Fact two.\n   - Source: https://ex.com/2 (2026-07-02)',
  });
  assert.equal(written.outcome, 'written');
  assert.match(readFileSync(written.path, 'utf8'), /Fact one/);

  rmSync(root, { recursive: true, force: true });
});
