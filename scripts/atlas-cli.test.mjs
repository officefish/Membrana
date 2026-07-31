/**
 * Зубы CLI справочника: три разницы дрейфа и состояние реестра (§3).
 *
 * Прогон: `node --test scripts/atlas-cli.test.mjs`
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(repoRoot, 'scripts', 'tooling-atlas.mjs');
const ATLAS = join(repoRoot, 'docs', 'tooling-atlas', 'registry', 'ATLAS.md');
const REGISTRY = join(repoRoot, 'docs', 'namespaces', 'REGISTRY.json');

/** Прогон CLI: падение — предмет проверки, а не помеха. */
function run(args) {
  try {
    return { status: 0, out: execFileSync(process.execPath, [CLI, ...args], { cwd: repoRoot, encoding: 'utf8' }) };
  } catch (e) {
    return { status: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** Поправить файл, прогнать, вернуть как было — что бы ни случилось. */
function withBroken(file, content, fn) {
  const backup = `${file}.zub-backup`;
  copyFileSync(file, backup);
  try {
    writeFileSync(file, content, 'utf8');
    return fn();
  } finally {
    copyFileSync(backup, file);
    execFileSync(process.execPath, ['-e', `require('fs').unlinkSync(${JSON.stringify(backup)})`]);
  }
}

test('чистое дерево: три разницы сошлись и производные свежи', () => {
  const r = run(['--check']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /три разницы сошлись \(обнаружение, манифесты, неймспейсы\)/u);
  assert.match(r.out, /производные свежи/u);
});

test('несвежий индекс ловится и назван адресом', () => {
  const r = withBroken(ATLAS, '# подделка\n', () => run(['--check']));
  assert.equal(r.status, 1);
  assert.match(r.out, /registry\/ATLAS\.md разъехался с источником/u);
  assert.match(r.out, /пересобери/u);
});

test('нечитаемый реестр — НЕ «ноль правил», а отказ источника истины', () => {
  // Молча отрендерить пустую секцию значило бы выдать поломку за состояние.
  const r = withBroken(REGISTRY, '{ не json', () => run(['--check']));
  assert.equal(r.status, 1);
  assert.match(r.out, /реестр неймспейсов: unreadable/u);
  assert.match(r.out, /проекция пуста НЕ потому, что правил нет/u);
});

test('битый реестр не роняет весь индекс', () => {
  // Запись членства к индексу контейнеров отношения не имеет; обрушить из-за неё справочник
  // значило бы наказать за чужую поломку.
  const r = withBroken(REGISTRY, '{ не json', () => run(['--audit']));
  assert.equal(r.status, 0, 'аудит контейнеров переживает битый реестр');
});

test('отчёт различает роды разниц, а не схлопывает в «дрейф»', () => {
  const out = run(['--check']).out;
  // Даже в зелёном прогоне видно, что разниц три — читатель знает, что именно проверялось.
  assert.match(out, /обнаружение, манифесты, неймспейсы/u);
});

test('render идемпотентен: второй прогон не меняет файл', () => {
  const before = readFileSync(ATLAS, 'utf8');
  assert.equal(run(['--render']).status, 0);
  assert.equal(readFileSync(ATLAS, 'utf8'), before, 'иначе дрейф ловил бы собственный рендер');
});

test('соседние глаголы не сломаны проводом дрейфа', () => {
  assert.equal(run(['--audit']).status, 0);
  assert.match(run(['--decompose', '--by', 'plane']).out, /Категория/u);
  assert.match(run(['--inspect', 'scripts']).out, /мастерская скриптов/u);
});

test('индекс несёт проекцию реестра, а не выдумку', () => {
  const md = readFileSync(ATLAS, 'utf8');
  assert.match(md, /## Неймспейсы \(проекция реестра\)/u);
  // Реестр сегодня пуст и валиден — секция обязана сказать это словами.
  assert.match(md, /Правил членства \*\*ноль\*\*/u);
});
