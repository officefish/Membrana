/**
 * Зубы сверки хука с каноном (`PRIORITY_HOOK_CANON`, решено владельцем 31.07).
 *
 * Прогон: `node --test scripts/hook-collision.test.mjs`
 */

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  COLLISION_STATES,
  checkHookCollision,
  findDemandingHooks,
  renderCollision,
} from './lib/hook-collision.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Каталог хуков-макет. */
function hooks(files) {
  const dir = mkdtempSync(join(tmpdir(), 'hooks-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body, 'utf8');
  return dir;
}

const VENDOR = '#!/bin/bash\n# Installed by codebase-memory-mcp\nALWAYS use codebase-memory-mcp tools FIRST for ANY code exploration\n';
const CANON_OK = 'норма\n> **`codebase-memory-mcp` — разведка, а не прибор** (решено 31.07)\n';

// ── Четыре состояния, и ни одного пятого ──────────────────────────────────────────────────

test('состояний ровно четыре', () => {
  assert.deepEqual(Object.values(COLLISION_STATES), ['resolved', 'unresolved', 'no_hook', 'no_canon']);
});

test('хук требует, канон отвечает — разведена', () => {
  const r = checkHookCollision({ canonText: CANON_OK, hooksDir: hooks({ 'cbm-session-reminder': VENDOR }) });
  assert.equal(r.state, COLLISION_STATES.RESOLVED);
  assert.equal(r.hooks.length, 1);
});

test('хук требует, канон молчит — та самая дыра 31.07', () => {
  const r = checkHookCollision({ canonText: 'норма без приоритета', hooksDir: hooks({ 'cbm-session-reminder': VENDOR }) });
  assert.equal(r.state, COLLISION_STATES.UNRESOLVED);
  const text = renderCollision(r).join('\n');
  // Спор должен идти о цитатах, а не о памяти: нехватка цитаты рядом с нормой и стоила
  // холодной сессии решения на ходу.
  assert.match(text, /ALWAYS use codebase-memory-mcp tools FIRST/u);
  assert.match(text, /записать в AGENTS\.md/u);
});

test('хука нет — НЕ ошибка: у другого разработчика MCP может быть не установлен', () => {
  const r = checkHookCollision({ canonText: CANON_OK, hooksDir: hooks({}) });
  assert.equal(r.state, COLLISION_STATES.NO_HOOK);
  assert.doesNotMatch(renderCollision(r).join('\n'), /^✖/u, 'красный там был бы ложным');
  // Каталога нет вовсе — тоже не ошибка.
  assert.equal(checkHookCollision({ canonText: CANON_OK, hooksDir: join(tmpdir(), 'нет-такого') }).state, COLLISION_STATES.NO_HOOK);
});

test('канон не прочитан — сверять не с чем, и это сказано прямо', () => {
  const dir = hooks({ 'cbm-session-reminder': VENDOR });
  assert.equal(checkHookCollision({ canonText: null, hooksDir: dir }).state, COLLISION_STATES.NO_CANON);
  assert.equal(checkHookCollision({ canonText: '   ', hooksDir: dir }).state, COLLISION_STATES.NO_CANON);
});

// ── Устойчивость к переписыванию вендором ─────────────────────────────────────────────────

test('ловится СМЫСЛ, а не дословная фраза', () => {
  // Привязка к точной строке дала бы ложное «коллизии нет» на первом же обновлении MCP.
  const reworded = '# hook\nAlways run the graph search first before any code discovery.\n';
  const r = checkHookCollision({ canonText: 'молчит', hooksDir: hooks({ 'other-name': reworded }) });
  assert.equal(r.state, COLLISION_STATES.UNRESOLVED, 'переформулировка требования всё ещё коллизия');
});

test('обход по каталогу, а не по имени файла', () => {
  // Завтра установщик может назвать файл иначе; проверка на имя молча ослепла бы.
  const found = findDemandingHooks(hooks({ 'совсем-другое-имя': VENDOR }));
  assert.equal(found.length, 1);
  assert.equal(found[0].name, 'совсем-другое-имя');
});

test('безобидный хук коллизией не считается', () => {
  const harmless = '#!/bin/bash\necho "добрый день"\n';
  assert.deepEqual(findDemandingHooks(hooks({ greet: harmless })), []);
});

// ── Живая машина ──────────────────────────────────────────────────────────────────────────

test('на этой машине коллизия разведена каноном', () => {
  const canon = readFileSync(join(repoRoot, 'AGENTS.md'), 'utf8');
  const r = checkHookCollision({ canonText: canon });
  // Либо MCP не установлен (тогда no_hook), либо установлен и канон отвечает.
  assert.ok(
    [COLLISION_STATES.RESOLVED, COLLISION_STATES.NO_HOOK].includes(r.state),
    `состояние ${r.state}: ${r.reason}`,
  );
});

test('вендорный файл НЕ правится — проверка только читает', async () => {
  const src = readFileSync(join(repoRoot, 'scripts/lib/hook-collision.mjs'), 'utf8');
  // Правка вендорного файла молча откатится при обновлении MCP, а сам файл общий для всех
  // репозиториев владельца.
  assert.ok(!/writeFileSync|appendFileSync|rmSync|unlinkSync/u.test(src), 'в модуле не должно быть записи');
});
