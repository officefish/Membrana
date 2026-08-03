/**
 * Зуб kits-pins-prepush-strict: затронутость кита пушем — оба пути, не только счастливый.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { affectedKits, normalizeRepoPath, repinHint } from './lib/kits-prepush-strict.mjs';

const KITS = [
  { id: 'witcher', dir: 'kits/witcher', pinnedPaths: ['scripts/bestiary-audit.mjs', 'scripts/lib/lens-bestiary.mjs'] },
  { id: 'angelina-morning', dir: 'kits/angelina-morning', pinnedPaths: ['scripts/_main-day-issue.mjs'] },
];

test('пуш не трогает пины → 0 китов, аудит не нужен', () => {
  const r = affectedKits({ kits: KITS, changedFiles: ['docs/HANDOFF.md', 'package.json'] });
  assert.deepEqual(r, []);
});

test('вещдок 26.07: правка lens-bestiary.mjs вскрывает ровно witcher', () => {
  const r = affectedKits({ kits: KITS, changedFiles: ['scripts/lib/lens-bestiary.mjs', 'docs/x.md'] });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'witcher');
  assert.deepEqual(r[0].touched, ['scripts/lib/lens-bestiary.mjs']);
});

test('две правки — два кита, каждый со своим следом', () => {
  const r = affectedKits({ kits: KITS, changedFiles: ['scripts/lib/lens-bestiary.mjs', 'scripts/_main-day-issue.mjs'] });
  assert.deepEqual(r.map((a) => a.id), ['witcher', 'angelina-morning']);
});

test('правка внутри kits/<id>/ (перепин, манифест) вскрывает кит без совпадения по пинам', () => {
  const r = affectedKits({ kits: KITS, changedFiles: ['kits/witcher/MANIFEST.json'] });
  assert.deepEqual(r.map((a) => a.id), ['witcher']);
});

test('обратные слэши Windows нормализуются к виду описи', () => {
  const r = affectedKits({ kits: KITS, changedFiles: ['scripts\\lib\\lens-bestiary.mjs'] });
  assert.deepEqual(r.map((a) => a.id), ['witcher']);
  assert.equal(normalizeRepoPath('.\\kits\\witcher'), 'kits/witcher');
});

test('подсказка ремонта называет точную команду перепина по имени кита', () => {
  const hint = repinHint(['witcher', 'angelina-morning']);
  assert.match(hint, /yarn kits:pins --id witcher --write/u);
  assert.match(hint, /yarn kits:pins --id angelina-morning --write/u);
});

// ── Шот H (03.08): полный рецепт ремонта в момент падения ─────────────────────────────────────

test('шот H: у падения дрейфа — обе половины рецепта, шаблон коммита с живым именем кита', async () => {
  // Трижды за два дня ремонт делался руками одинаково; форма шаблона ратифицирована
  // владельцем по трём влитым коммитам. Ядро несёт команду, CLI — процедуру.
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./kits-prepush-strict.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes('влить отдельным ревьюируемым коммитом: chore(kits): опись ${id} догнала <предмет>'), 'шаблон-константа в CLI');
  assert.ok(src.includes('for (const id of broken) console.error(repairCommitHint(id))'), 'печать за командой ремонта');
  // Граница: шаблона коммита в ЯДРЕ нет — там только команда.
  const core = readFileSync(new URL('./lib/kits-prepush-strict.mjs', import.meta.url), 'utf8');
  assert.ok(!core.includes('chore(kits)'), 'ядро не знает процедуры отгрузки');
});
