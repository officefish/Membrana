/**
 * Зубы предиката единственного входа в утро (блок `entry-single-predicate`, вердикт M4-H).
 *
 * Ядро зубится на фикстурах, порт — на фикстурной ФС: зуб на живом дереве мерил бы дерево,
 * а не правило, и краснел бы от каждой чужой правки.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { entryLine, judgeMorningEntries } from './lib/morning-entry.mjs';
import { observeMorningEntries } from './angelina.mjs';

const DOOR = 'yarn ritual:day';
const CHAIN = 'node scripts/procedure-run-record.mjs open --procedure ritual-day --evidence x.json && node scripts/angelina.mjs';

// ── ядро ──────────────────────────────────────────────────────────────────────

test('|entry|=1: одна команда — вход единственный', () => {
  const v = judgeMorningEntries([{ layer: 'command', name: DOOR, command: DOOR }]);
  assert.equal(v.ok, true);
  assert.equal(v.count, 1);
  assert.equal(v.reason, null);
});

test('|entry|=1: скилл, велящий ту же команду, — свидетель двери, а НЕ вторая дверь', () => {
  // Ровно этого требовал вердикт M1: «ссылка, не копия». Первая редакция предиката считала
  // упоминания и на живом дереве объявила две двери там, где дверь одна.
  const v = judgeMorningEntries([
    { layer: 'command', name: DOOR, command: DOOR },
    { layer: 'skill', name: 'membrana-morning-ritual', command: DOOR },
  ]);
  assert.equal(v.ok, true, 'указатель на дверь дверью не является');
  assert.equal(v.count, 1);
  assert.equal(v.entries[0].witnesses.length, 2, 'но свидетель записан — по нему видно, кто ведёт к двери');
});

test('|entry|=1 КРАСНОЕ: вторая команда, открывающая утро', () => {
  const v = judgeMorningEntries([
    { layer: 'command', name: DOOR, command: DOOR },
    { layer: 'command', name: 'yarn morning:old', command: 'yarn morning:old' },
  ]);
  assert.equal(v.ok, false);
  assert.equal(v.count, 2);
  assert.match(v.reason, /входов в утро 2/u);
  assert.match(v.reason, /yarn morning:old/u, 'вторая дверь названа поимённо — «их две» без имён не лечится');
});

test('|entry|=1 КРАСНОЕ: автозапуск начинает утро без человека — тоже дверь', () => {
  const v = judgeMorningEntries([
    { layer: 'command', name: DOOR, command: DOOR },
    { layer: 'autostart', name: '.husky/post-checkout', command: 'yarn ritual:auto' },
  ]);
  assert.equal(v.ok, false);
  assert.match(v.reason, /post-checkout/u);
});

test('|entry|=1 КРАСНОЕ: автозапуск ТОЙ ЖЕ команды — не свидетель, а вторая дверь', () => {
  // Граница, найденная порчей живого дерева: хук с той же командой оставлял встречу зелёной.
  // Скилл указывает путь человеку; хук входит сам — вердикт M4 отверг демона прямо.
  const v = judgeMorningEntries([
    { layer: 'command', name: DOOR, command: DOOR },
    { layer: 'skill', name: 'membrana-morning-ritual', command: DOOR },
    { layer: 'autostart', name: '.husky/post-merge', command: DOOR },
  ]);
  assert.equal(v.ok, false);
  assert.equal(v.count, 2, 'скилл схлопнулся в свидетеля, хук — нет');
  assert.match(v.reason, /post-merge/u);
});

test('|entry|=1 КРАСНОЕ в обе стороны: ноль дверей — утро недостижимо', () => {
  const v = judgeMorningEntries([]);
  assert.equal(v.ok, false, 'молчать о недостижимом утре хуже, чем сказать');
  assert.match(v.reason, /утро недостижимо/u);
});

test('|entry|=1: слой вне закрытого списка — ошибка входа, а не «прочее»', () => {
  const v = judgeMorningEntries([{ layer: 'выдуманный', name: 'x', command: 'y' }]);
  assert.equal(v.ok, false);
  assert.match(v.reason, /вне закрытого списка/u);
});

test('|entry|=1: один и тот же свидетель дважды свидетелем дважды не становится', () => {
  const v = judgeMorningEntries([
    { layer: 'command', name: DOOR, command: DOOR },
    { layer: 'command', name: DOOR, command: DOOR },
  ]);
  assert.equal(v.ok, true);
  assert.equal(v.entries[0].witnesses.length, 1);
});

test('строка встречи — вердикт, а не утверждение', () => {
  const ok = entryLine(judgeMorningEntries([{ layer: 'command', name: DOOR, command: DOOR }]));
  assert.match(ok, /проверено/u, 'зелёное говорит, что проверено, а не что «так устроено»');
  const bad = entryLine(judgeMorningEntries([
    { layer: 'command', name: DOOR, command: DOOR },
    { layer: 'command', name: 'yarn morning:old', command: 'yarn morning:old' },
  ]));
  assert.match(bad, /^✖/u, 'красное видно с первого знака');
});

// ── порт ──────────────────────────────────────────────────────────────────────

/** Фикстурная ФС: наблюдение проверяется на выдуманном дереве, не на живом. */
const fsOf = (files) => ({
  join: (...p) => p.join('/'),
  existsSync: (p) => Object.hasOwn(files, p) || Object.keys(files).some((f) => f.startsWith(`${p}/`)),
  readFileSync: (p) => {
    if (!Object.hasOwn(files, p)) throw new Error(`нет файла ${p}`);
    return files[p];
  },
  readdirSync: (p) => {
    const seen = new Set();
    for (const f of Object.keys(files)) {
      if (!f.startsWith(`${p}/`)) continue;
      seen.add(f.slice(p.length + 1).split('/')[0]);
    }
    return [...seen];
  },
});

test('наблюдение: команда, открывающая процедуру утра, найдена', () => {
  const io = fsOf({ 'r/package.json': JSON.stringify({ scripts: { 'ritual:day': CHAIN } }) });
  const found = observeMorningEntries('r', io);
  assert.deepEqual(found, [{ layer: 'command', name: DOOR, command: DOOR }]);
});

test('наблюдение: шаг цепочки дверью НЕ считается — он исполняет начатое, а не начинает', () => {
  const io = fsOf({
    'r/package.json': JSON.stringify({ scripts: { 'ritual:day': CHAIN, 'plan:day': 'node scripts/day-plan.mjs' } }),
  });
  assert.equal(observeMorningEntries('r', io).length, 1);
});

test('наблюдение: живой скилл, велящий команду, — свидетель; мёртвый и молчащий — нет', () => {
  const io = fsOf({
    'r/package.json': JSON.stringify({ scripts: { 'ritual:day': CHAIN } }),
    'r/.cursor/skills/membrana-morning-ritual/SKILL.md': 'status: live\n## Сценарий (`yarn ritual:day`)',
    'r/.cursor/skills/membrana-old-morning/SKILL.md': 'status: deprecated\nзови `yarn ritual:day`',
    'r/.cursor/skills/membrana-developer-rhythm/SKILL.md': 'status: live\nУтро вычеркнуто, см. morning-ritual',
  });
  const found = observeMorningEntries('r', io);
  assert.equal(found.filter((f) => f.layer === 'skill').length, 1, 'протухший скилл и ссылка свидетелями не являются');
  assert.equal(judgeMorningEntries(found).ok, true, 'свидетель двери не делает вторую дверь');
});

test('наблюдение: автозапуск в комментарии дверью не является, в живой строке — является', () => {
  const base = { 'r/package.json': JSON.stringify({ scripts: { 'ritual:day': CHAIN } }) };
  const commented = observeMorningEntries('r', fsOf({
    ...base,
    'r/.github/workflows/nightly.yml': '# кадр night-report процедуры yarn ritual:day\njobs: {}',
  }));
  assert.equal(commented.filter((f) => f.layer === 'autostart').length, 0, 'комментарий утро не запускает');

  const live = observeMorningEntries('r', fsOf({
    ...base,
    'r/.husky/post-merge': 'yarn ritual:day',
  }));
  assert.equal(live.filter((f) => f.layer === 'autostart').length, 1);
  const v = judgeMorningEntries(live);
  assert.equal(v.ok, false, 'автозапуск ТОЙ ЖЕ команды — вторая дверь: он входит в утро без человека');
  assert.match(v.reason, /без человека/u, 'причина названа так, чтобы читатель понял, чем эта дверь отличается');
});

test('наблюдение КРАСНОЕ: второй скрипт, открывающий утро, виден как вторая дверь', () => {
  const io = fsOf({
    'r/package.json': JSON.stringify({ scripts: { 'ritual:day': CHAIN, 'morning:old': CHAIN } }),
  });
  const v = judgeMorningEntries(observeMorningEntries('r', io));
  assert.equal(v.ok, false);
  assert.equal(v.count, 2);
  assert.match(v.reason, /morning:old/u);
});

test('наблюдение: нечитаемое дерево дверей не выдумывает', () => {
  assert.deepEqual(observeMorningEntries('r', fsOf({})), []);
  assert.equal(judgeMorningEntries(observeMorningEntries('r', fsOf({}))).ok, false, 'пусто — значит утро недостижимо');
});
