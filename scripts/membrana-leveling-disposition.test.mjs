import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  bucketByDisposition,
  disposition,
  inferRunJournalTrail,
  inferTempOrScratch,
  readyFacts,
} from './lib/membrana-leveling-disposition.mjs';
import { runLevelingGate } from './lib/membrana-leveling-gate.mjs';
import { PRODUCT_CASES } from './fixtures/membrana-leveling-disposition-product.mjs';

test('inferTempOrScratch: temp / scratchpad / .tmp', () => {
  assert.equal(inferTempOrScratch('C:/Users/x/AppData/Local/Temp/foo.md'), true);
  assert.equal(inferTempOrScratch('%TEMP%/wip.txt'), true);
  assert.equal(inferTempOrScratch('/tmp/x'), true);
  assert.equal(inferTempOrScratch('docs/scratchpad/note.md'), true);
  assert.equal(inferTempOrScratch('scripts/cache/x.tmp'), true);
  assert.equal(inferTempOrScratch('docs/tasks/README.md'), false);
});

test('readyFacts: needs ciGreen ∧ ¬conflicts ∧ prApproved', () => {
  assert.equal(readyFacts({ ciGreen: true, conflictsMain: false, prApproved: true }), true);
  assert.equal(readyFacts({ ciGreen: true, conflictsMain: true, prApproved: true }), false);
  assert.equal(readyFacts({ ciGreen: true, conflictsMain: false, prApproved: false }), false);
});

test('1: isTempOrScratch → trash even in active session', () => {
  assert.equal(
    disposition('%TEMP%/shot.md', {
      dirty: true,
      inActiveSession: true,
      registered: true,
      isTempOrScratch: true,
    }),
    'trash',
  );
  assert.equal(
    disposition('docs/scratchpad/x.md', { dirty: true, inActiveSession: true }),
    'trash',
  );
});

test('2: dirty ∧ inActiveSession → live (before fallback trash)', () => {
  assert.equal(
    disposition('apps/client/src/App.tsx', {
      dirty: true,
      registered: false,
      inActiveSession: true,
    }),
    'live',
  );
});

test('3: readyFacts ∧ stamp ∧ registered ∧ ¬session → ready', () => {
  assert.equal(
    disposition('scripts/lib/foo.mjs', {
      dirty: false,
      registered: true,
      inActiveSession: false,
      ciGreen: true,
      conflictsMain: false,
      prApproved: true,
      leadStamp: true,
      unitOf: 'pr-42',
    }),
    'ready',
  );
});

test('readyFacts ∧ ¬stamp → unfinished (not ready)', () => {
  assert.equal(
    disposition('scripts/lib/foo.mjs', {
      registered: true,
      inActiveSession: false,
      ciGreen: true,
      conflictsMain: false,
      prApproved: true,
      leadStamp: false,
    }),
    'unfinished',
  );
});

test('4: registered ∧ ¬ready → unfinished', () => {
  assert.equal(
    disposition('docs/prompts/X.md', {
      registered: true,
      dirty: true,
      inActiveSession: false,
      ciGreen: false,
    }),
    'unfinished',
  );
});

test('5: dirty ∧ ¬registered → trash (fallback, after live)', () => {
  assert.equal(
    disposition('root-orphan.log', {
      dirty: true,
      registered: false,
      inActiveSession: false,
    }),
    'trash',
  );
});

test('totality: clean unregistered → trash', () => {
  assert.equal(disposition('mystery.bin', {}), 'trash');
});

test('ctx.isTempOrScratch overrides path heuristic', () => {
  assert.equal(
    disposition('docs/tasks/README.md', { isTempOrScratch: true }),
    'trash',
  );
  assert.equal(
    disposition('%TEMP%/keep.md', {
      isTempOrScratch: false,
      dirty: true,
      inActiveSession: true,
    }),
    'live',
  );
});

test('bucketByDisposition groups baskets', () => {
  const b = bucketByDisposition([
    { path: 'a.ts', ctx: { dirty: true, inActiveSession: true } },
    {
      path: 'b.ts',
      ctx: {
        registered: true,
        ciGreen: true,
        prApproved: true,
        leadStamp: true,
      },
    },
    { path: 'c.ts', ctx: { registered: true } },
    { path: 'd.tmp', ctx: { dirty: true } },
  ]);
  assert.deepEqual(b.live, ['a.ts']);
  assert.deepEqual(b.ready, ['b.ts']);
  assert.deepEqual(b.unfinished, ['c.ts']);
  assert.deepEqual(b.trash, ['d.tmp']);
});

test('product criterion: ≥10 hand-labeled cases match disposition', () => {
  assert.ok(PRODUCT_CASES.length >= 10, `need ≥10, got ${PRODUCT_CASES.length}`);
  /** @type {string[]} */
  const mismatches = [];
  for (const row of PRODUCT_CASES) {
    const fact = disposition(row.path, row.ctx);
    if (fact !== row.expect) {
      mismatches.push(`${row.path}: expect ${row.expect}, got ${fact} (${row.kind})`);
    }
  }
  assert.equal(mismatches.length, 0, mismatches.join('\n'));
});

// ── #2418: выравнивание требовало имени для СВОЕГО ЖЕ журнала ─────────────────────
//
// КРАСНЫЙ ВХОД: вечер дописывает `docs/procedure-runs/trail/<дата>.jsonl` раньше, чем
// шаг `leveling-workspace` считает дерево. Лента выходит `dirty ∧ ¬registered`, по
// тотальности падает в `trash`, гейт встаёт на `unnamed-trash` → exit 3. Так было
// 17, 18, 21 и 22.09 — четыре вечера подряд, поимённо названный в билете «мусор»
// оказывался лентой самого прогона.

test('#2418 лента прогона опознаётся по форме пути, не по содержимому', () => {
  assert.equal(inferRunJournalTrail('docs/procedure-runs/trail/2026-09-22.jsonl'), true);
  assert.equal(inferRunJournalTrail('./docs/procedure-runs/trail/2026-09-22.jsonl'), true);
  assert.equal(inferRunJournalTrail(String.raw`docs\procedure-runs\trail\2026-09-22.jsonl`), true);
  assert.equal(inferRunJournalTrail('C:/w/Membrana/docs/procedure-runs/trail/2026-09-22.jsonl'), true);
});

test('#2418 класс УЗКИЙ: соседи по каталогу мусором быть не перестают', () => {
  assert.equal(inferRunJournalTrail('docs/procedure-runs/trail/notes.md'), false);
  assert.equal(inferRunJournalTrail('docs/procedure-runs/digest-2026-09-22.md'), false);
  assert.equal(inferRunJournalTrail('docs/procedure-runs/trail/2026-09-22.jsonl.bak'), false);
  assert.equal(inferRunJournalTrail('docs/seanses/2026-09-22.jsonl'), false);
  assert.equal(inferRunJournalTrail(''), false);
});

test('#2418 лента прогона — live, а не trash: dirty ∧ ¬registered её не роняет', () => {
  const d = disposition('docs/procedure-runs/trail/2026-09-22.jsonl', {
    dirty: true,
    registered: false,
    inActiveSession: false,
  });
  assert.equal(d, 'live', 'тотальность правила 5 объявляла журнал прогона безымянным мусором');
});

test('#2418 корзины: лента уходит в L, корзина T остаётся пустой', () => {
  const baskets = bucketByDisposition([
    { path: 'docs/procedure-runs/trail/2026-09-22.jsonl', ctx: { dirty: true, registered: false } },
  ]);
  assert.deepEqual(baskets.trash, [], 'непустая T — это и есть unnamed-trash и exit 3');
  assert.deepEqual(baskets.live, ['docs/procedure-runs/trail/2026-09-22.jsonl']);
});

test('#2418 гейт с одной лентой в дереве даёт pass, а не stop:unnamed-trash', () => {
  const gate = runLevelingGate({
    items: [{ path: 'docs/procedure-runs/trail/2026-09-22.jsonl', ctx: { dirty: true, registered: false } }],
  });
  assert.equal(gate.status, 'pass');
  assert.ok(!gate.reason.includes('unnamed-trash'), `гейт встал: ${gate.reason.join(', ')}`);
});

test('#2418 НАСТОЯЩИЙ безымянный мусор гейт по-прежнему останавливает', () => {
  const gate = runLevelingGate({
    items: [{ path: 'docs/procedure-runs/trail/2026-09-22.jsonl', ctx: { dirty: true, registered: false } },
            { path: 'notes-todo.txt', ctx: { dirty: true, registered: false } }],
  });
  assert.equal(gate.status, 'stop', 'исключение для ленты не должно глушить весь класс');
  assert.ok(gate.reason.includes('unnamed-trash'));
  assert.deepEqual(gate.baskets.T, ['notes-todo.txt']);
});
