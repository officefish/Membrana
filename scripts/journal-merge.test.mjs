/**
 * Зубы союзного слияния журналов (#2096).
 *
 * Ядро зубится на фикстурах; правило `.gitattributes` — на НАСТОЯЩЕМ git в фикстурном
 * репозитории. Проверять правило моделью нельзя: предикат описывает соглашение, а
 * исполняет его git, и разойтись они могут молча — при сборке этого шота ровно так и
 * случилось, ядро считало три файла журналами раньше, чем правило начало их покрывать.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  findJournalDuplicates,
  isJournalPath,
  looksAppendOnly,
  recordKey,
  unguardedJournals,
} from './lib/journal-merge.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── соглашение ────────────────────────────────────────────────────────────────

test('соглашение: журнал опознаётся каталогом trail/ или op-log/', () => {
  assert.equal(isJournalPath('docs/sprint/trail/x.jsonl'), true);
  assert.equal(isJournalPath('docs/sprint/cut/trail/x.jsonl'), true, 'четвёртый класс, найденный разведкой');
  assert.equal(isJournalPath('docs/procedure-runs/trail/2026-08-23.jsonl'), true);
  assert.equal(isJournalPath('docs/virtual-team/memory/op-log/dynin/2026-08-23.jsonl'), true);
});

test('соглашение: вторая ось — имя файла', () => {
  assert.equal(isJournalPath('docs/audit/one-shot-trail.jsonl'), true);
  assert.equal(isJournalPath('docs/comms/sent-log.jsonl'), true);
});

test('соглашение КРАСНОЕ: подстрока дверью не является', () => {
  // `docs/trailer/` содержит «trail», но журналом не является. Ошибка подстроки тиха и
  // потому опаснее ложного отказа: файл молча уехал бы под союз.
  assert.equal(isJournalPath('docs/trailer/x.jsonl'), false);
  assert.equal(isJournalPath('docs/op-logger/x.jsonl'), false);
});

test('соглашение: фикстуры отменяют признак журнала, даже лёжа в trail/', () => {
  assert.equal(isJournalPath('docs/sprint/cut/fixtures/trail/plan.jsonl'), false);
  assert.equal(isJournalPath('scripts/lib/execution-trace/fixtures/plan-lied.jsonl'), false);
});

test('соглашение: не-.jsonl журналом не считается', () => {
  assert.equal(isJournalPath('docs/sprint/trail/README.md'), false);
  assert.equal(isJournalPath('docs/tasks/registry.json'), false, 'у реестра свой семантический драйвер');
});

// ── ключ записи ───────────────────────────────────────────────────────────────

test('ключ записи: первое присутствующее поле из закрытого списка', () => {
  assert.equal(recordKey({ traceId: 'tr-1', id: 'иной' }), 'traceId:tr-1', 'порядок предпочтения соблюдён');
  assert.equal(recordKey({ eventId: 'e1' }), 'eventId:e1');
  assert.equal(recordKey({ id: 'x' }), 'id:x');
});

test('ключ записи: запись без ключа законна и ключа не выдумывает', () => {
  // Лента актов нарезки ключа не несёт. Составной ключ из «похожих» полей объявил бы
  // двойниками два разных акта одной персоны в одну секунду.
  assert.equal(recordKey({ kind: 'cut_act', subject: 'ozhegov', at: '2026-08-23' }), null);
  assert.equal(recordKey(null), null);
  assert.equal(recordKey('строка'), null);
});

// ── двойники ──────────────────────────────────────────────────────────────────

test('ДВОЙНИК ПО КЛЮЧУ: тот случай, который союз склеивает молча', () => {
  // Опыт 23.08 на живом git: две стороны дописали строки с одним traceId и разным
  // содержимым — union слил без единого маркера. До союза здесь был конфликт.
  const body = [
    '{"traceId":"tr-1","kind":"context_run","who":"Б"}',
    '{"traceId":"tr-1","kind":"review_pass","who":"Г"}',
  ].join('\n');
  const { keyed } = findJournalDuplicates(body);
  assert.equal(keyed.length, 1);
  assert.equal(keyed[0].key, 'traceId:tr-1');
  assert.equal(keyed[0].variants.length, 2);
});

test('ТОЧНЫЙ ПОВТОР: дважды записанный акт в append-only ленте — сбой', () => {
  const line = '{"traceId":"tr-1","kind":"context_run"}';
  const { exact } = findJournalDuplicates(`${line}\n${line}\n`);
  assert.equal(exact.length, 1);
  assert.equal(exact[0].count, 2);
});

test('честный журнал двойников не даёт', () => {
  const body = [
    '{"traceId":"tr-1","kind":"context_run"}',
    '{"traceId":"tr-2","kind":"review_pass"}',
    '{"kind":"cut_act","subject":"ozhegov"}',
  ].join('\n');
  const { keyed, exact } = findJournalDuplicates(body);
  assert.deepEqual(keyed, []);
  assert.deepEqual(exact, []);
});

test('нечитаемая строка считается, но зуб на ней не падает', () => {
  const { unreadable, keyed } = findJournalDuplicates('не json\n{"traceId":"tr-1"}\n');
  assert.equal(unreadable, 1);
  assert.deepEqual(keyed, []);
});

// ── класс, а не файл ──────────────────────────────────────────────────────────

test('append-only судится долей удалений, а не чистым нулём', () => {
  // У живых журналов есть редкие корректирующие правки: замер 23.08 — одна на 80 коммитов.
  assert.equal(looksAppendOnly({ adds: 482, dels: 8, commits: 80 }), true, 'журнал с одной правкой');
  assert.equal(looksAppendOnly({ adds: 2789, dels: 591, commits: 63 }), false, 'переписываемый архив');
  assert.equal(looksAppendOnly({ adds: 3, dels: 0, commits: 1 }), false, 'истории мало — судить нечем');
});

test('КЛАСС, А НЕ ФАЙЛ: сосед по каталогу переписывается — значит союз там неверен', () => {
  // Замер 23.08: в memory/archive три файла из шести чисто дописываются, а три переписаны.
  // Чистым просто не дошла очередь; объявить их журналами по личной удаче — подгонка.
  const observed = [
    { path: 'docs/virtual-team/memory/archive/dynin.jsonl', adds: 360, dels: 0, commits: 20 },
    { path: 'docs/virtual-team/memory/archive/ozhegov.jsonl', adds: 559, dels: 192, commits: 21 },
  ];
  assert.deepEqual(unguardedJournals(observed), [], 'каталог смешанный — журналом не объявляем');
});

test('КЛАСС: чистый каталог вне соглашения назван поимённо', () => {
  const observed = [{ path: 'docs/новое/лента.jsonl', adds: 100, dels: 0, commits: 10 }];
  assert.deepEqual(unguardedJournals(observed), ['docs/новое/лента.jsonl'], 'пятый класс не спрячется');
});

test('КЛАСС: фикстуры непокрытыми не считаются — они исключены намеренно', () => {
  const observed = [{ path: 'scripts/lib/execution-trace/fixtures/plan-lied.jsonl', adds: 97, dels: 0, commits: 3 }];
  assert.deepEqual(unguardedJournals(observed), []);
});

// ── правило на НАСТОЯЩЕМ git ──────────────────────────────────────────────────

/** Фикстурный репозиторий с боевым `.gitattributes`. */
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'journal-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q', '.');
  git('config', 'user.email', 'зуб@test');
  git('config', 'user.name', 'зуб');
  copyFileSync(join(REPO_ROOT, '.gitattributes'), join(root, '.gitattributes'));
  const write = (rel, body) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), body, 'utf8');
  };
  return { root, git, write, read: (rel) => readFileSync(join(root, rel), 'utf8'), cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('ПРАВИЛО ЖИВЬЁМ: два расходящихся дописывания сливаются без конфликта и без потерь', () => {
  const { root, git, write, read, cleanup } = repo();
  try {
    const J = 'docs/sprint/trail/спринт.jsonl';
    write(J, '{"traceId":"tr-1"}\n{"traceId":"tr-2"}\n');
    git('add', '-A'); git('commit', '-qm', 'base');
    git('checkout', '-qb', 'сессия-Б');
    write(J, `${read(J)}{"traceId":"tr-Б"}\n`);
    git('commit', '-qam', 'Б');
    git('checkout', '-q', '-');
    write(J, `${read(J)}{"traceId":"tr-Г"}\n`);
    git('commit', '-qam', 'Г');
    git('merge', 'сессия-Б', '-m', 'merge');

    const body = read(J);
    assert.doesNotMatch(body, /<<<<<<</u, 'конфликта нет');
    for (const key of ['tr-1', 'tr-2', 'tr-Б', 'tr-Г']) {
      assert.equal((body.match(new RegExp(`"${key}"`, 'gu')) ?? []).length, 1,
        `строка ${key} на месте и ровно одна — потерянная строка журнала хуже громкого конфликта`);
    }
  } finally { cleanup(); }
});

test('ПРАВИЛО ЖИВЬЁМ: файл вне класса конфликтует как раньше — правило не расползлось', () => {
  const { root, git, write, read, cleanup } = repo();
  try {
    write('docs/state.json', '{"состояние":"снимок"}\n');
    write('docs/tasks-snapshot.jsonl', '{"snapshot":1}\n');
    git('add', '-A'); git('commit', '-qm', 'base');
    git('checkout', '-qb', 'их');
    write('docs/state.json', '{"состояние":"их"}\n');
    write('docs/tasks-snapshot.jsonl', '{"snapshot":2}\n');
    git('commit', '-qam', 'их');
    git('checkout', '-q', '-');
    write('docs/state.json', '{"состояние":"наше"}\n');
    write('docs/tasks-snapshot.jsonl', '{"snapshot":3}\n');
    git('commit', '-qam', 'наше');
    let failed = false;
    try { git('merge', 'их', '-m', 'merge'); } catch { failed = true; }

    assert.equal(failed, true, 'снимок состояния обязан конфликтовать');
    assert.match(read('docs/state.json'), /<<<<<<</u);
    assert.match(read('docs/tasks-snapshot.jsonl'), /<<<<<<</u, 'расширение .jsonl само по себе союза не даёт');
  } finally { cleanup(); }
});

test('ПРАВИЛО ЖИВЬЁМ: фикстура и ловушка имени под союз не идут', () => {
  const { root, git, write, cleanup } = repo();
  try {
    write('scripts/fixtures/f.jsonl', '{"traceId":"fx"}\n');
    write('docs/trailer/не-журнал.jsonl', '{"id":"x"}\n');
    write('docs/sprint/trail/j.jsonl', '{"traceId":"tr"}\n');
    git('add', '-A'); git('commit', '-qm', 'base');
    const attrs = git('check-attr', 'merge', '--', 'scripts/fixtures/f.jsonl', 'docs/trailer/не-журнал.jsonl', 'docs/sprint/trail/j.jsonl');
    assert.match(attrs, /fixtures\/f\.jsonl: merge: unspecified/u, 'у фикстуры важно последнее значение');
    assert.match(attrs, /trailer.*: merge: unspecified/u, 'подстрока «trail» дверью не является');
    assert.match(attrs, /sprint\/trail\/j\.jsonl: merge: union/u);
  } finally { cleanup(); }
});
