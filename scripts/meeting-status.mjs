#!/usr/bin/env node
/**
 * scripts/meeting-status.mjs
 *
 * Где заседание и далеко ли до конца.
 *
 *   yarn meeting:status --id meeting-format
 *
 * Тонкая обёртка над `lib/meeting-walk.mjs` (эталон #413: чистое ядро + обёртка).
 *
 * ИСТОЧНИК ФАЗ — РЕЕСТР, а не свой файл. Первая редакция читала собственный
 * ROADMAP.json и была снята как дубль: в `docs/tasks/registry.json` уже 505 карточек
 * под 88 эпиками с `parentEpic`/`status`/`leadPersona`/`promptPath` — это и есть фазы,
 * и второй трекер того же — прямой риск «четвёртой полуреализации» из
 * insight-truth-tokens-owner-facts. Здесь берутся карточки `parentEpic: <id>`.
 *
 * СВОЁ — ТОЛЬКО РЁБРА. У карточки 14 полей, поля зависимостей нет ни одного; DAG из
 * вердикта M0 лежит в `docs/meeting/<id>/DEPS.json` и больше ничего не несёт.
 *
 * ПРОГРЕСС НЕ ХРАНИТСЯ. Он вычисляется из `status` карточек. Причина: первый прогон
 * формата дал рукописный MEETING_ACTIVE.md, противоречивший сам себе тремя строками
 * («идёт» + «вердикт ожидается» + «вердикт есть»). Рукописное состояние поедет всегда —
 * правило канона «не хранить правду, хранить, как её перепроверить».
 *
 * Регламент: docs/MEETING_REGULATION.md
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeMeetingWalk, isStalled } from './lib/meeting-walk.mjs';

const root = process.cwd();

function parseArgs(argv) {
  let id = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--id') id = argv[++i] ?? '';
    else if (argv[i].startsWith('--id=')) id = argv[i].slice('--id='.length);
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: yarn meeting:status --id <meeting-id>');
      process.exit(0);
    }
  }
  if (!id) {
    console.error('Не задан --id. Пример: yarn meeting:status --id meeting-format');
    process.exit(1);
  }
  return { id };
}

const { id } = parseArgs(process.argv.slice(2));

const registry = JSON.parse(readFileSync(resolve(root, 'docs/tasks/registry.json'), 'utf8'));
const cards = (registry.tasks ?? []).filter((t) => t?.parentEpic === id);
if (cards.length === 0) {
  console.error(`\nВ реестре нет фаз с parentEpic: ${id}.`);
  console.error('  Фазы заводятся штатно: yarn task:register --id <slug> --parent-epic ' + id + ' …\n');
  process.exit(1);
}

const depsPath = resolve(root, `docs/meeting/${id}/DEPS.json`);
const deps = existsSync(depsPath) ? JSON.parse(readFileSync(depsPath, 'utf8')) : { edges: {}, ratification: null };

// Узлы собираются из карточек; рёбра подмешиваются из DEPS. Карточка без ребра —
// не ошибка (корень), ребро без карточки — ошибка, её поймает roadmapProblems.
const nodes = cards.map((c) => ({
  id: c.id,
  label: c.title,
  dependsOn: deps.edges?.[c.id] ?? [],
}));
for (const edgeId of Object.keys(deps.edges ?? {})) {
  if (!cards.some((c) => c.id === edgeId)) nodes.push({ id: edgeId, label: '(ребро без карточки)', dependsOn: deps.edges[edgeId] });
}

// Закрыт = карточка архивирована. Не «ярлык вопроса встретился в протоколе»: этот
// замер даёт ложные срабатывания (эрратум к S-M2 — команда выдала вердикт, не назвав
// `O1`). Архивация — существующий контур закрытия (`yarn task:archive`), у неё уже есть
// DoD, LGTM и archiveNotes.
const closed = cards.filter((c) => c.status !== 'active').map((c) => c.id);
const walk = computeMeetingWalk({ nodes, closed });
const label = (nodeId) => nodes.find((n) => n?.id === nodeId)?.label ?? '';
const lead = (nodeId) => cards.find((c) => c.id === nodeId)?.leadPersona ?? '—';

console.log(`\nЗаседание «${id}» — ${walk.progress}`);
console.log(`Фазы: реестр (parentEpic: ${id}) · рёбра: docs/meeting/${id}/DEPS.json`);
if (deps.ratification) {
  console.log(`Порядок ратифицирован: ${deps.ratification.by} · ${deps.ratification.at}`);
} else {
  console.log('⚠ Порядок БЕЗ ратификации — остаётся предложением председателя.');
}

if (walk.problems.length > 0) {
  console.error('\n✗ ДЕФЕКТЫ КАРТЫ — обходу верить нельзя:');
  for (const p of walk.problems) console.error(`  · ${p}`);
}

if (walk.done.length) {
  console.log('\nЗакрыто (карточка архивирована):');
  for (const n of walk.done) console.log(`  ✓ ${n} — ${label(n)}`);
}
if (walk.ready.length) {
  console.log('\nМожно созывать:');
  for (const n of walk.ready) console.log(`  → ${n} — ${label(n)}  [${lead(n)}]`);
}
if (walk.blocked.length) {
  console.log('\nЖдут предшественников (Hard rule 3):');
  for (const b of walk.blocked) console.log(`  · ${b.id} — ${label(b.id)} ← ждёт ${b.waitingFor.join(', ')}`);
}
for (const [nodeId, epic] of Object.entries(deps.external ?? {})) {
  console.log(`\n⚠ ${nodeId} — граница зоны: зависит от эпика «${epic}», решаться может не здесь.`);
}

if (isStalled(walk)) {
  console.error('\n✗ ТУПИК: не пройдено, а созывать нечего. Само не дойдёт — нужен владелец.');
  process.exit(2);
}
if (walk.complete) {
  console.log('\n✓ Заседание ДОШЛО ДО КОНЦА: все фазы архивированы.');
  console.log('  Дальше — сборка активных вердиктов в эпик, PR → LGTM Teamlead → мёрж.\n');
} else {
  console.log(`\nДо конца: ${nodes.length - walk.done.length} фаз(ы).\n`);
}
process.exit(walk.problems.length > 0 ? 1 : 0);
