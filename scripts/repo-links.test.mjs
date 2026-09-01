/**
 * Зубы адреса репозитория (#2249).
 *
 * Порча владельца: подсунуть генератору задачу со ссылкой — адрес обязан совпасть с
 * константой, а не с тем, что модель помнит.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { REPO } from './lib/github-issues-audit.mjs';
import { normalizeRepoLinks, rewrittenLinksNote } from './lib/repo-links.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GENERATOR = join(HERE, '_main-day-issue.mjs');

test('#2249 ПОРЧА: ссылка на несуществующий репозиторий переписана на константу', () => {
  // Ровно то, что модель выдала 01.09.
  const text = 'Магистраль: [#2247](https://github.com/membrana-io/membrana/issues/2247) — честный код возврата.';
  const { text: fixed, rewritten } = normalizeRepoLinks(text, REPO);
  assert.match(fixed, new RegExp(`github\\.com/${REPO.replace('/', '\\/')}/issues/2247`, 'u'));
  assert.doesNotMatch(fixed, /membrana-io/u, 'сочинённый адрес не должен пережить нормализацию');
  assert.equal(rewritten.length, 1);
  assert.equal(rewritten[0].from, 'membrana-io/membrana');
  assert.equal(rewritten[0].number, '2247');
});

test('#2249 три ссылки в одном документе — все три, и подмена названа числом', () => {
  const text = [
    '[#2244](https://github.com/membrana-io/membrana/issues/2244)',
    '[#2248](https://github.com/membrana-io/membrana/pull/2248)',
    '[#2232](https://github.com/wrong-owner/other/issues/2232)',
  ].join('\n');
  const { text: fixed, rewritten } = normalizeRepoLinks(text, REPO);
  assert.equal(rewritten.length, 3);
  assert.equal((fixed.match(new RegExp(REPO.replace('/', '\\/'), 'gu')) ?? []).length, 3);
  const note = rewrittenLinksNote(rewritten, REPO);
  assert.match(note, /адрес репозитория в ссылках исправлен/u);
  assert.match(note, /membrana-io\/membrana → officefish\/Membrana \(2\)/u, 'счёт по владельцу, а не общий');
});

test('#2249 верный адрес не трогается — и подмены не объявляется', () => {
  const text = `[#1](https://github.com/${REPO}/issues/1)`;
  const { text: fixed, rewritten } = normalizeRepoLinks(text, REPO);
  assert.equal(fixed, text);
  assert.equal(rewritten.length, 0);
  assert.equal(rewrittenLinksNote(rewritten, REPO), null, 'исправному тексту нечего сообщать');
});

test('#2249 ЧУЖИЕ ссылки на github не ломаются: чинится только наш путь issues/pull', () => {
  // «Починить» чужой проект значило бы сломать верную ссылку — это вторая сторона той же
  // болезни: действовать по догадке вместо источника.
  const text = [
    'https://github.com/nodejs/node/releases/tag/v22.0.0',
    'https://github.com/anthropics/claude-code',
    'https://github.com/some/repo/blob/main/README.md',
  ].join('\n');
  const { text: fixed, rewritten } = normalizeRepoLinks(text, REPO);
  assert.equal(fixed, text);
  assert.equal(rewritten.length, 0);
});

test('#2249 адрес-константа обязана быть «owner/name», иначе отказ, а не тихая работа', () => {
  assert.throws(() => normalizeRepoLinks('текст', 'membrana'), /owner\/name/u);
  assert.throws(() => normalizeRepoLinks('текст', ''), /owner\/name/u);
});

test('#2249 ПРОВОДКА: генератор берёт адрес у константы, а не сочиняет', () => {
  const src = readFileSync(GENERATOR, 'utf8');
  assert.match(src, /import \{ REPO \} from '\.\/lib\/github-issues-audit\.mjs'/u, 'константа импортирована');
  assert.match(src, /normalizeRepoLinks\(body, REPO\)/u, 'тело документа проходит нормализацию');
  assert.match(src, /writeFileSync\(outputPath, header \+ normalized\.text/u, 'на диск едет нормализованное');
  assert.match(src, /if \(note\) console\.error\(note\)/u, 'подмена называется, а не молчит');
});

test('#2249 константа REPO — единственный источник адреса', () => {
  const audit = readFileSync(resolve(HERE, 'lib', 'github-issues-audit.mjs'), 'utf8');
  assert.match(audit, /export const REPO = 'officefish\/Membrana'/u);
  // Второе объявление адреса где угодно в скриптах — это возврат к двум источникам.
  const lib = readFileSync(resolve(HERE, 'lib', 'repo-links.mjs'), 'utf8');
  assert.doesNotMatch(lib, /officefish\/Membrana/u, 'нормализатор не знает адреса — он его ПОЛУЧАЕТ');
});
