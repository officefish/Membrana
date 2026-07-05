/**
 * CC9 — раннер первого выхода контура v0.1.
 *
 * Запуск: `yarn workspace @membrana/comms-studio generate:v0.1` (через tsx).
 * Подключает детерминированный генератор к агенту (CC8), пишет брифы в `out/v0.1/`.
 * `refresh: false` — локальный/ручной прогон не делает git pull; в расписании агента refresh=true.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgent } from './agent.js';
import { describeComponents } from './generator.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(PKG_ROOT, '..', '..');

const res = await runAgent({
  pkgRoot: PKG_ROOT,
  repoRoot: REPO_ROOT,
  generate: describeComponents,
  refresh: false,
});

console.log(`Контур v0.1: записано артефактов ${res.written.length} в out/v0.1/`);
for (const w of res.written) {
  console.log(`  ${resolve(w.path)} (${w.bytes} b)`);
}
