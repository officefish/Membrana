import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatRagContextBlock,
  parseRagCliFlags,
  shouldUsePersonaRag,
} from './lib/rag-ritual.mjs';

test('formatRagContextBlock reports skip reason', () => {
  const block = formatRagContextBlock({ skipped: true, reason: 'no key' });
  assert.match(block, /пропущен/);
  assert.match(block, /no key/);
});

test('formatRagContextBlock renders fragments', () => {
  const block = formatRagContextBlock({
    skipped: false,
    result: {
      usedOperative: true,
      usedArchive: false,
      fragments: [
        {
          text: 'hello',
          score: 0.8,
          circuit: 'operative',
          metadata: { source: 'docs/CURRENT_TASK.md' },
        },
      ],
    },
  });
  assert.match(block, /CURRENT_TASK/);
  assert.match(block, /operative/);
});

test('parseRagCliFlags', () => {
  assert.deepEqual(parseRagCliFlags(['--no-rag']), { noRag: true, fullRag: false, enableRag: false });
  assert.deepEqual(parseRagCliFlags(['--full-rag', '--rag']), {
    noRag: false,
    fullRag: true,
    enableRag: true,
  });
});

test('shouldUsePersonaRag defaults for vesnin/ozhegov', () => {
  assert.equal(shouldUsePersonaRag({ persona: 'vesnin' }), true);
  assert.equal(shouldUsePersonaRag({ persona: 'ozhegov' }), true);
  assert.equal(shouldUsePersonaRag({ persona: 'dynin' }), false);
  assert.equal(shouldUsePersonaRag({ persona: 'dynin', enableRag: true }), true);
  assert.equal(shouldUsePersonaRag({ persona: 'vesnin', noRag: true }), false);
});
