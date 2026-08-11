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

// ── b6 s-queue-2026-08-11: абсолютный --out/--snapshot не клеится к cwd ──────

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname as pathDirname, join as pathJoin } from 'node:path';
import { fileURLToPath as toPath } from 'node:url';

describe('leveling: абсолютные пути CLI', () => {
  it('snapshot --out <абсолютный> пишет по названному пути, а не по склейке с cwd', () => {
    // Дефект 26.07: join(cwd, 'C:\…') давал 'C:\repo\C:\…' и ENOENT.
    const scripts = pathDirname(toPath(import.meta.url));
    const out = pathJoin(mkdtempSync(pathJoin(tmpdir(), 'lvl-abs-')), 'deep', 'snap.json');
    execFileSync(process.execPath, [pathJoin(scripts, 'membrana-leveling-snapshot.mjs'), '--out', out], {
      encoding: 'utf8', cwd: pathJoin(scripts, '..'),
    });
    assert.ok(existsSync(out), `снимок не появился по абсолютному пути: ${out}`);
    const snap = JSON.parse(readFileSync(out, 'utf8'));
    assert.ok(Array.isArray(snap.items));
  });

  it('workspace-level --snapshot <абсолютный> читает по названному пути', () => {
    const scripts = pathDirname(toPath(import.meta.url));
    const dir = mkdtempSync(pathJoin(tmpdir(), 'lvl-abs2-'));
    const snapPath = pathJoin(dir, 'snap.json');
    writeFileSync(snapPath, JSON.stringify({ items: [], namedTrash: {} }));
    // Достаточно того, что файл ПРОЧИТАН по абсолютному пути: ошибка чтения
    // дала бы код 2 с «ENOENT …склейка…»; пустой снимок — валидный вход.
    const r = execFileSync(process.execPath, [pathJoin(scripts, 'membrana-leveling-workspace-level.mjs'), '--snapshot', snapPath], {
      encoding: 'utf8', cwd: pathJoin(scripts, '..'),
    });
    assert.ok(typeof r === 'string');
  });
});

describe('leveling: пути с .. в середине', () => {
  it('snapshot --out с ..-сегментом нормализуется resolve-ом', () => {
    const scripts = pathDirname(toPath(import.meta.url));
    const base = mkdtempSync(pathJoin(tmpdir(), 'lvl-dots-'));
    const out = pathJoin(base, 'a', '..', 'snap.json'); // resolve → base/snap.json
    execFileSync(process.execPath, [pathJoin(scripts, 'membrana-leveling-snapshot.mjs'), '--out', out], {
      encoding: 'utf8', cwd: pathJoin(scripts, '..'),
    });
    assert.ok(existsSync(pathJoin(base, 'snap.json')), '..-сегмент не нормализован');
  });
});
