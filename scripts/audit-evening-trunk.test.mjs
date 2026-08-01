/**
 * Зуб слепоты диапазона: аудит дня обязан считать по СТВОЛУ, а не по ветке автора.
 *
 * ВЕЩДОК 31.07: `audit-evening` брал `HEAD` — голову ветки, в которой запущен. Все шесть
 * коммитов соседних сессий того дня лежали в стволе и оказались ВНЕ диапазона: день соседей
 * не был увиден вовсе, а первая редакция хендофа отчеканена вслепую.
 *
 * ЗУБ ПРОВЕРЯЕТ САМ СЕБЯ. Сперва доказывает, что его образец ловит старую форму, и только
 * потом утверждает её отсутствие. Иначе достаточно сломать образец — и зуб замолчит навсегда,
 * оставаясь на вид защитой. Молчащий зуб хуже отсутствующего.
 *
 * Предикат берётся из `lib/audit-trunk.mjs`, а НЕ из скрипта `audit-evening.mjs`: скрипт
 * выполняет тело на импорте (гоняет весь аудит, пишет `docs/DAILY_AUDIT.md`) и зовёт
 * `process.exit(2)` при отсутствии ствола — тест ради одной функции сносил бы артефакт дня
 * и убивал процесс. Прежняя версия обходила это через `{ skip: !fn }`, то есть молча зеленела
 * там, где защиты нет вовсе — зверь «Молчаливый зелёный» (B6), найдено ревью PR #1612.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_TRUNK_REF,
  resolveTrunk,
  trunkRefFrom,
  trunkRefusalMessage,
} from './lib/audit-trunk.mjs';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const AUDIT_SRC = resolve(SCRIPTS_DIR, 'audit-evening.mjs');

/** Старая форма: диапазон дня считается от `HEAD`. */
const HEAD_RANGE_RX = /rev-list',\s*'-1',[^;]*'HEAD'/u;

/** Как выглядела строка до починки — образец для самопроверки зуба. */
const BLIND_FORM = "  base = git('rev-list', '-1', `--before=${date} 00:00`, 'HEAD');";

/** Как выглядит сейчас. */
const TRUNK_FORM = "  base = git('rev-list', '-1', `--before=${date} 00:00`, trunk.ref);";

// ── самопроверка зуба ──────────────────────────────────────────────────────────────

test('образец зуба ловит старую форму — иначе зуб был бы пустым', () => {
  assert.match(BLIND_FORM, HEAD_RANGE_RX, 'зуб обязан уметь покраснеть');
});

test('образец не срабатывает на починенной форме — ложного красного нет', () => {
  assert.doesNotMatch(TRUNK_FORM, HEAD_RANGE_RX);
});

// ── сам зуб ────────────────────────────────────────────────────────────────────────

test('в исходнике не осталось отсчёта по HEAD: слепота не возвращается молча', () => {
  assert.doesNotMatch(readFileSync(AUDIT_SRC, 'utf8'), HEAD_RANGE_RX, 'диапазон дня обязан считаться от ствола');
});

// ── контракт ссылки ствола ─────────────────────────────────────────────────────────

test('умолчание названо в коде, а не подразумевается', () => {
  assert.equal(DEFAULT_TRUNK_REF, 'origin/main');
  assert.equal(trunkRefFrom({}), 'origin/main');
  assert.equal(trunkRefFrom({ AUDIT_TRUNK_REF: '  ' }), 'origin/main', 'пробелы — не имя ссылки');
});

test('ссылка переопределяется переменной среды', () => {
  assert.equal(trunkRefFrom({ AUDIT_TRUNK_REF: 'upstream/main' }), 'upstream/main');
});

test('ствол разрешается — предикат отдаёт ref и sha', () => {
  assert.deepEqual(resolveTrunk('origin/main', () => 'deadbeef'), {
    ok: true,
    ref: 'origin/main',
    sha: 'deadbeef',
  });
});

test('ствола нет — отказ С ПРИЧИНОЙ, а не тихий откат к HEAD', () => {
  const missing = resolveTrunk('origin/main', () => {
    throw new Error('unknown revision');
  });
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /нет в этом дереве/u);

  const empty = resolveTrunk('origin/main', () => '');
  assert.equal(empty.ok, false);
  assert.match(empty.reason, /не разрешается в коммит/u);
});

test('отказ говорит не только «нет», но и что делать', () => {
  const msg = trunkRefusalMessage('ссылки «origin/main» нет в этом дереве');
  assert.match(msg, /git fetch origin/u);
  assert.match(msg, /AUDIT_TRUNK_REF/u);
  assert.match(msg, /вещдок 31\.07/u, 'причина нормы называется вместе с отказом');
});

test('скрипт зовёт отказ, а не откат: выход кодом 2 остался в исходнике', () => {
  assert.match(readFileSync(AUDIT_SRC, 'utf8'), /process\.exit\(2\)/u);
});
