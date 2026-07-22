import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  auditPins,
  formatPinAuditTable,
  makeAnchorResolveSegment,
  normalizeSegmentLines,
  resolveSegmentInText,
  segmentHashOf,
} from './lib/audit-pins.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'audit-pins-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

function write(rel, body) {
  const abs = join(tmp, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, body);
}

test('normalize: хвостовые пробелы и CRLF не меняют хэш смысла', () => {
  const a = segmentHashOf(['hello  ', 'world']);
  const b = segmentHashOf(normalizeSegmentLines(['hello', 'world']).split('\n'));
  assert.equal(a, segmentHashOf(['hello', 'world']));
  assert.equal(a, b);
});

test('matched: правка соседа не двигает хэш отрезка (marker)', () => {
  const segment = [
    '<!-- pin:START door -->',
    'line-a',
    '<!-- pin:END door -->',
  ];
  const hash = segmentHashOf(segment);
  write(
    'doc.md',
    ['# Title', 'neighbor above', ...segment, 'neighbor below', ''].join('\n'),
  );
  const pins = [
    {
      path: 'doc.md',
      anchor: { kind: 'marker', ref: 'door' },
      segmentHash: hash,
    },
  ];
  const findings = auditPins(pins, makeAnchorResolveSegment(tmp));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].status, 'matched');
  assert.equal(findings[0].blocking, false);
});

test('segment-drift: правка внутри отрезка', () => {
  const oldSeg = ['<!-- pin:START door -->', 'old', '<!-- pin:END door -->'];
  const newSeg = ['<!-- pin:START door -->', 'new', '<!-- pin:END door -->'];
  write('doc.md', newSeg.join('\n'));
  const findings = auditPins(
    [
      {
        path: 'doc.md',
        anchor: { kind: 'marker', ref: 'door' },
        segmentHash: segmentHashOf(oldSeg),
      },
    ],
    makeAnchorResolveSegment(tmp),
  );
  assert.equal(findings[0].status, 'segment-drift');
  assert.equal(findings[0].blocking, true);
  assert.ok(findings[0].repairVerb.includes('segmentHash'));
  assert.equal(findings[0].actualHash, segmentHashOf(newSeg));
});

test('anchor-lost: удалили marker', () => {
  write('doc.md', '# no markers\n');
  const findings = auditPins(
    [
      {
        path: 'doc.md',
        anchor: { kind: 'marker', ref: 'door' },
        segmentHash: 'a'.repeat(40),
      },
    ],
    makeAnchorResolveSegment(tmp),
  );
  assert.equal(findings[0].status, 'anchor-lost');
  assert.equal(findings[0].blocking, true);
});

test('ambiguous: два одинаковых heading', () => {
  const body = '## Same\nbody1\n\n## Same\nbody2\n';
  write('doc.md', body);
  const r = resolveSegmentInText(body, { kind: 'heading', ref: 'Same' });
  assert.equal(r.status, 'ambiguous');
  assert.equal(r.count, 2);
  const findings = auditPins(
    [
      {
        path: 'doc.md',
        anchor: { kind: 'heading', ref: 'Same' },
        segmentHash: 'b'.repeat(40),
      },
    ],
    makeAnchorResolveSegment(tmp),
  );
  assert.equal(findings[0].status, 'ambiguous');
});

test('formatPinAuditTable: без blocking — зелёная строка', () => {
  const md = formatPinAuditTable([
    {
      kind: 'matched',
      path: 'x',
      anchorKind: 'marker',
      pinType: 'segment',
      status: 'matched',
      repairVerb: '—',
      expectedHash: 'a'.repeat(40),
      actualHash: 'a'.repeat(40),
      blocking: false,
    },
  ]);
  assert.match(md, /все пины целы/);
});

test('signature: один блок по хэшу — resolved', () => {
  const block = ['unique-paragraph-content'];
  const sig = segmentHashOf(block);
  const text = `# H\n\n${block[0]}\n\nother\n`;
  const r = resolveSegmentInText(text, { kind: 'signature', ref: sig });
  assert.equal(r.status, 'resolved');
  assert.deepEqual(r.lines, block);
});
