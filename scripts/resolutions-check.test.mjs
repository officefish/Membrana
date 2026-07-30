/**
 * Зуб живости resolutions (#1493 Ф2).
 *
 * ВЕЩДОК 30.07: при разборе корзины #1422 три захода ушли впустую, потому что ключ
 * `postcss@npm:8.5.14` не покрывает запрос `postcss@npm:^8.4.47`. Потом ключи вычистили
 * «как мёртвые» и снесли два ЖИВЫХ — точные пины были настоящими запросами. Отличить
 * одно от другого на глаз нельзя; здесь проверяется, что инструмент отличает.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  KEY_STATES,
  checkResolutions,
  packageOfKey,
  requestedDescriptors,
  resolvedVersions,
  summarize,
} from './lib/resolutions-liveness.mjs';

const LOCK = `
"postcss@npm:^8.4.47":
  version: 8.5.25
  resolution: "postcss@npm:8.5.25"

"js-yaml@npm:5.2.1":
  version: 5.2.2
  resolution: "js-yaml@npm:5.2.2"

"minimatch@npm:9.0.9":
  version: 9.0.9
  resolution: "minimatch@npm:9.0.9"
  dependencies:
    brace-expansion: "npm:^2.0.2"

"brace-expansion@npm:^2.0.2":
  version: 2.1.3
  resolution: "brace-expansion@npm:2.1.3"
`;

test('запросы видны и в заголовках записей, и в строках зависимостей', () => {
  const d = requestedDescriptors(LOCK);
  assert.ok(d.has('postcss@npm:^8.4.47'), 'заголовок записи');
  assert.ok(d.has('brace-expansion@npm:^2.0.2'), 'строка зависимости у носителя');
});

test('ВЕЩДОК: ключ по разрешённой версии — мёртвый, по запросу — живой', () => {
  const rows = checkResolutions(
    { 'postcss@npm:8.5.14': '8.5.25', 'postcss@npm:^8.4.47': '8.5.25' },
    LOCK,
  );
  const dead = rows.find((r) => r.key === 'postcss@npm:8.5.14');
  const live = rows.find((r) => r.key === 'postcss@npm:^8.4.47');
  assert.equal(dead.state, 'мёртвый');
  assert.match(dead.reason, /никто не просит/u);
  assert.equal(live.state, 'действует');
});

test('ВЕЩДОК: точный пин — ЖИВОЙ запрос, а не разрешённая версия (снесли зря 30.07)', () => {
  const rows = checkResolutions({ 'js-yaml@npm:5.2.1': '5.2.2' }, LOCK);
  assert.equal(rows[0].state, 'действует', 'js-yaml@npm:5.2.1 просит @nestjs/swagger — ключ живой');
});

test('запрос есть, но цель не встала — отдельный исход, не «действует»', () => {
  const rows = checkResolutions({ 'minimatch@npm:9.0.9': '9.1.0' }, LOCK);
  assert.equal(rows[0].state, 'не встал');
  assert.match(rows[0].reason, /цель 9\.1\.0/u);
});

test('ключ без @npm: — общий по имени; мёртв только если пакета нет в дереве', () => {
  assert.equal(checkResolutions({ postcss: '8.5.25' }, LOCK)[0].state, 'действует');
  assert.equal(checkResolutions({ multer: '2.2.0' }, LOCK)[0].state, 'мёртвый');
  assert.match(checkResolutions({ multer: '2.2.0' }, LOCK)[0].reason, /нет в дереве/u);
});

test('имя пакета вынимается и из scoped-ключа', () => {
  assert.equal(packageOfKey('@fastify/static@npm:^8.0.0'), '@fastify/static');
  assert.equal(packageOfKey('js-yaml@npm:5.2.1'), 'js-yaml');
  assert.equal(packageOfKey('express'), 'express');
});

test('версии в дереве читаются по resolution, а не по version', () => {
  assert.deepEqual([...resolvedVersions(LOCK, 'postcss')], ['8.5.25']);
  assert.deepEqual([...resolvedVersions(LOCK, 'нет-такого')], []);
});

test('исходы — закрытый словарь', () => {
  const rows = checkResolutions(
    { 'postcss@npm:8.5.14': '8.5.25', 'postcss@npm:^8.4.47': '8.5.25', 'minimatch@npm:9.0.9': '9.1.0' },
    LOCK,
  );
  for (const r of rows) assert.ok(KEY_STATES.includes(r.state), `${r.state} вне словаря`);
});

test('чистый набор не выдумывает находок', () => {
  const rep = summarize(checkResolutions({ 'postcss@npm:^8.4.47': '8.5.25' }, LOCK));
  assert.equal(rep.state, 'чисто');
  assert.deepEqual(rep.dead, []);
  assert.deepEqual(rep.stuck, []);
});

test('пустые resolutions — не находка', () => {
  assert.equal(summarize(checkResolutions({}, LOCK)).state, 'чисто');
  assert.equal(summarize(checkResolutions(undefined, LOCK)).state, 'чисто');
});
