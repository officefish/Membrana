/**
 * Tests for dirty→ctx snapshot wires (ml-adopt-wires).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildLevelingSnapshot,
  dirtyPathsFromPorcelain,
  loadCtxOverlay,
  parsePorcelainPath,
} from './lib/membrana-leveling-snapshot.mjs';

describe('membrana-leveling-snapshot', () => {
  it('parsePorcelainPath: modified / untracked / rename', () => {
    assert.equal(parsePorcelainPath(' M docs/a.md'), 'docs/a.md');
    assert.equal(parsePorcelainPath('?? scripts/x.mjs'), 'scripts/x.mjs');
    assert.equal(parsePorcelainPath('R  old.md -> new.md'), 'new.md');
  });

  it('dirtyPathsFromPorcelain dedupes', () => {
    const paths = dirtyPathsFromPorcelain(' M a.ts\n?? b.ts\n M a.ts\n');
    assert.deepEqual(paths, ['a.ts', 'b.ts']);
  });

  it('buildLevelingSnapshot: dirty + heuristic scratch; ports default false', () => {
    const snap = buildLevelingSnapshot({
      dirtyPaths: ['apps/client/src/x.ts', 'scratchpad/tmp-foo.ts'],
      now: '2026-07-25T00:00:00.000Z',
    });
    assert.equal(snap.items.length, 2);
    assert.equal(snap.items[0].ctx.dirty, true);
    assert.equal(snap.items[0].ctx.registered, false);
    assert.equal(snap.items[0].ctx.inActiveSession, false);
    assert.equal(snap.items[0].ctx.isTempOrScratch, false);
    assert.equal(snap.items[1].ctx.isTempOrScratch, true);
  });

  it('overlay + flags set registered / session / leadStamp (no mtime)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ml-snap-'));
    const overlay = join(dir, 'ctx.json');
    writeFileSync(
      overlay,
      JSON.stringify({
        paths: {
          'feat/a.ts': { registered: true, ciGreen: true, prApproved: true },
        },
        namedTrash: {
          'scratchpad/x.tmp': { action: 'dispose', reason: 'tmp' },
        },
      }),
      'utf8',
    );
    const { pathCtx, namedTrash } = loadCtxOverlay(overlay, dir);
    const snap = buildLevelingSnapshot({
      dirtyPaths: ['feat/a.ts', 'live/b.ts'],
      pathCtx,
      namedTrash,
      sessionPaths: ['live/b.ts'],
      leadStampPaths: ['feat/a.ts'],
      overlayPath: overlay,
    });
    const a = snap.items.find((i) => i.path === 'feat/a.ts');
    const b = snap.items.find((i) => i.path === 'live/b.ts');
    assert.equal(a?.ctx.registered, true);
    assert.equal(a?.ctx.leadStamp, true);
    assert.equal(a?.ctx.ciGreen, true);
    assert.equal(b?.ctx.inActiveSession, true);
    assert.equal(b?.ctx.registered, false);
    assert.ok(snap.namedTrash['scratchpad/x.tmp']);
  });
});
