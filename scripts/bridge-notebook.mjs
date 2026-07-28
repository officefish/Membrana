#!/usr/bin/env node
/**
 * yarn bridge:notebook — тетрадь наблюдений капитана (M6, #1352).
 *
 *   yarn bridge:notebook append --body "…" [--session <id|дата>]
 *   yarn bridge:notebook uttered --id <obs-id> [--session …]
 *   yarn bridge:notebook list [--session …] [--json]
 *   yarn bridge:notebook counts [--session …] [--json]   # счётчики для квитанции
 *
 * Свободный контур: append-only, один флаг uttered, БЕЗ машины погашения и БЕЗ
 * стоп-гейтов (наблюдение не входит в антецедент gate.parrot_live_if_debts; close
 * не требует all-uttered). Наблюдение долгом само не становится: мост — только
 * явный жест капитана через yarn bridge:debt birth (auto obs→debt запрещён, M6 DoD п.3).
 * Пусто — норма: «наблюдения: 0».
 *
 * Exit: 0; 1 — отказ; 2 — usage.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { appendNotebookEvent, foldNotebook, notebookCounts, readNotebook } from './lib/captain-notebook.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const verb = argv[0];
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

function main() {
  const sessionId = flag('session') ?? new Date().toISOString().slice(0, 10);
  const at = new Date().toISOString();
  const state = foldNotebook(readNotebook(repoRoot, sessionId));

  if (verb === 'append') {
    const body = flag('body');
    if (!String(body ?? '').trim()) {
      console.error('bridge:notebook — отказ: пустое наблюдение не пишется (пустая тетрадь — норма, пустая запись — нет)');
      return 1;
    }
    const id = `o${state.size + 1}-${at.slice(11, 19).replaceAll(':', '')}`;
    appendNotebookEvent(repoRoot, sessionId, { verb: 'append', id, body, sessionId, at });
    console.log(`bridge:notebook — записано «${id}» (сессия ${sessionId}); наблюдение ≠ долг: в долг — только явный жест bridge:debt birth`);
    return 0;
  }
  if (verb === 'uttered') {
    const id = flag('id');
    if (!id || !state.has(id)) {
      console.error(`bridge:notebook — отказ: наблюдение «${id ?? '?'}» не найдено в сессии ${sessionId}`);
      return 1;
    }
    if (state.get(id).uttered) {
      console.log(`bridge:notebook — идемпотентно: «${id}» уже озвучено (${state.get(id).utteredAt})`);
      return 0;
    }
    appendNotebookEvent(repoRoot, sessionId, { verb: 'uttered', id, at });
    console.log(`bridge:notebook — «${id}» отмечено озвученным`);
    return 0;
  }
  if (verb === 'list') {
    if (argv.includes('--json')) {
      console.log(JSON.stringify({ sessionId, observations: [...state.values()], counts: notebookCounts(state) }));
      return 0;
    }
    for (const o of state.values()) {
      console.log(`наблюдение ${o.id} · ${o.uttered ? 'озвучено' : 'не озвучено'} · session ${o.sessionId} — ${o.body}`);
    }
    console.log(`наблюдения: ${state.size}`);
    return 0;
  }
  if (verb === 'counts') {
    const c = notebookCounts(state);
    if (argv.includes('--json')) {
      console.log(JSON.stringify({ sessionId, ...c }));
      return 0;
    }
    console.log(`observations: total ${c.total} · uttered ${c.uttered} · unuttered ${c.unuttered} (факт для квитанции, не стоп)`);
    return 0;
  }
  console.error('Usage: yarn bridge:notebook append|uttered|list|counts (см. шапку файла)');
  return 2;
}

if (process.argv[1]?.endsWith('bridge-notebook.mjs')) process.exit(main());
