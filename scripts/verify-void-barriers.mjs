#!/usr/bin/env node
/**
 * Три барьера против возрождения (блок b4 спринта `angelina-hostess-impl`, вердикт M5-GC).
 *
 *   node scripts/verify-void-barriers.mjs [--json]
 *
 * ЗАЧЕМ ТРИ. Вердикт заседания: «Один барьер обходится случайно, три — только намеренно».
 * Прецедент холодной сессии 21.07: мёртвый сценарий вернулся в работу не злым умыслом, а
 * потому что грепом нашёлся как живой — шаг вернулся в цепочку, скрипт снова позвали.
 *
 *   барьер 1 — эпитафия в самом файле: первое, что видит читатель;
 *   барьер 2 — запись в индексе кладбища: путь ведёт в void;
 *   барьер 3 — грep-инвариант: НИ ОДНОЙ активной ссылки на `void/*` извне.
 *
 * Барьер 3 — тот, что ловит возрождение раньше человека: пока на мёртвый путь никто не
 * ссылается, он мёртв; появилась ссылка — кто-то уже зовёт покойника.
 *
 * ССЫЛКА ССЫЛКЕ РОЗНЬ. Документы САМОГО кладбища ссылаются на него законно, и канон
 * (`docs/void/README.md`, `docs/void/LIFECYCLE.md`) тоже: они объясняют правило, а не зовут
 * мёртвое. Активной считается ссылка из ЖИВОГО дерева на конкретную могилу.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VOID_DIR } from './lib/gc-void.mjs';

const EXIT_BREACH = 24;

/** Файлы кладбища, объясняющие правило, — не могилы и барьерами не проверяются. */
export const VOID_CANON = Object.freeze(['README.md', 'LIFECYCLE.md']);

/**
 * Перечислить могилы: каталоги кладбища, каждый — один перенесённый след.
 * @param {string} repoRoot
 * @returns {Array<{id: string, dir: string, files: string[]}>}
 */
export function listGraves(repoRoot, io = { existsSync, readdirSync, statSync }) {
  const root = join(repoRoot, VOID_DIR);
  if (!io.existsSync(root)) return [];
  const out = [];
  for (const name of io.readdirSync(root)) {
    if (VOID_CANON.includes(name)) continue;
    const dir = join(root, name);
    if (!io.statSync(dir).isDirectory()) continue;
    const files = [];
    const walk = (p, prefix) => {
      for (const child of io.readdirSync(p)) {
        const full = join(p, child);
        const rel = prefix === '' ? child : `${prefix}/${child}`;
        if (io.statSync(full).isDirectory()) walk(full, rel);
        else files.push(rel);
      }
    };
    walk(dir, '');
    out.push({ id: name, dir, files });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Барьер 1: каждый markdown могилы несёт эпитафию ПЕРВОЙ строкой.
 *
 * Не «где-то в файле»: эпитафия, задвинутая в конец, читателя не останавливает — он уже
 * прочитал мёртвый текст как живой.
 *
 * @returns {string[]} нарушения
 */
export function checkEpitaphs(graves, io = { readFileSync }) {
  const breaches = [];
  for (const grave of graves) {
    for (const file of grave.files) {
      if (!file.endsWith('.md')) continue;
      const body = io.readFileSync(join(grave.dir, file), 'utf8');
      if (!body.startsWith('---\nstatus: rejected')) {
        breaches.push(`барьер 1: ${VOID_DIR}/${grave.id}/${file} без эпитафии в начале файла`);
      }
    }
  }
  return breaches;
}

/**
 * Барьер 2: индекс кладбища называет каждую могилу.
 * @returns {string[]} нарушения
 */
export function checkIndex(repoRoot, graves, io = { existsSync, readFileSync }) {
  const indexPath = join(repoRoot, VOID_DIR, 'README.md');
  if (!io.existsSync(indexPath)) {
    return graves.length > 0 ? [`барьер 2: индекса ${VOID_DIR}/README.md нет, а могил ${graves.length}`] : [];
  }
  const index = io.readFileSync(indexPath, 'utf8');
  return graves.filter((g) => !index.includes(g.id)).map((g) => `барьер 2: ${g.id} не назван в индексе кладбища`);
}

/**
 * Барьер 3: грep-инвариант — активных ссылок на могилы из живого дерева нет.
 *
 * @param {string} repoRoot
 * @param {Array<{id: string}>} graves
 * @param {string[]} liveFiles пути живого дерева (относительные, без кладбища)
 */
export function checkNoLiveLinks(repoRoot, graves, liveFiles, io = { readFileSync }) {
  const breaches = [];
  for (const rel of liveFiles) {
    let body;
    try {
      body = io.readFileSync(join(repoRoot, rel), 'utf8');
    } catch {
      continue; // нечитаемое ссылкой не является
    }
    for (const grave of graves) {
      if (body.includes(`${VOID_DIR}/${grave.id}`)) {
        breaches.push(`барьер 3: ${rel} ссылается на могилу ${grave.id} — кто-то зовёт покойника`);
      }
    }
  }
  return breaches;
}

/** Живое дерево: доки и скрипты, кроме самого кладбища. */
function liveTree(repoRoot) {
  const out = [];
  const skip = new Set(['node_modules', '.git', '.yarn', 'dist', 'coverage']);
  const walk = (dir, prefix) => {
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue;
      const full = join(dir, name);
      const rel = prefix === '' ? name : `${prefix}/${name}`;
      if (rel === VOID_DIR) continue; // кладбище само себя не судит
      if (statSync(full).isDirectory()) walk(full, rel);
      else if (/\.(md|mjs|js|ts|json|ya?ml)$/u.test(name)) out.push(rel);
    }
  };
  for (const top of ['docs', 'scripts', '.cursor']) {
    const dir = join(repoRoot, top);
    if (existsSync(dir)) walk(dir, top);
  }
  return out;
}

export function verifyBarriers(repoRoot) {
  const graves = listGraves(repoRoot);
  const breaches = [
    ...checkEpitaphs(graves),
    ...checkIndex(repoRoot, graves),
    ...checkNoLiveLinks(repoRoot, graves, liveTree(repoRoot)),
  ];
  return { graves: graves.map((g) => g.id), breaches };
}

function main() {
  const repoRoot = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
  const result = verifyBarriers(repoRoot);
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.breaches.length === 0) {
    console.log(`void:barriers — могил ${result.graves.length} · все три барьера держат`);
  } else {
    console.log(`void:barriers — могил ${result.graves.length} · пробоев ${result.breaches.length}`);
    for (const b of result.breaches) console.log(`  ✖ ${b}`);
    console.log('  возрождение начинается с одной ссылки — вердикт M5 требует трёх барьеров разом');
  }
  process.exit(result.breaches.length === 0 ? 0 : EXIT_BREACH);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();

