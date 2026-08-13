/**
 * Зубы вечернего шага архива сессий (блок e1 спринта archivarius-evening-step).
 *
 * Держат контракт трёх инвариантов (ревью Веснина 13.08) и таблицу outcome→exit
 * (разбор Дынина 13.08): форма строки-отчёта снапшотом, тела строк транскриптов
 * в выводе не появляются, словарь исходов закрыт, exit — тотальная функция.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  OUTCOME_EXIT,
  OUTCOMES,
  buildEveningLine,
  buildSkipLine,
  checkOfficeHealth,
  filterFreshFiles,
  lineFor,
  runEveningStep,
  startOfDay,
} from './archivarius-evening-step.mjs';

const SECRET_MARKER = 'sk-ant-api03-test-secret-value-000000000000000000000000';

/** Каталог с двумя транскриптами: свежий (сегодня) и вчерашний. */
function makeTranscriptDir(now) {
  const dir = mkdtempSync(join(tmpdir(), 'archivarius-evening-'));
  const fresh = join(dir, 'aaaaaaaa-fresh.jsonl');
  const stale = join(dir, 'bbbbbbbb-stale.jsonl');
  writeFileSync(
    fresh,
    [
      JSON.stringify({ uuid: 'u-1', timestamp: now.toISOString(), role: 'user', text: `token ${SECRET_MARKER} inline` }),
      JSON.stringify({ uuid: 'u-2', timestamp: now.toISOString(), role: 'assistant', text: 'обычная реплика' }),
    ].join('\n'),
  );
  writeFileSync(stale, JSON.stringify({ uuid: 'u-old', role: 'user', text: 'вчерашняя реплика' }));
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  utimesSync(stale, yesterday, yesterday);
  return { dir, fresh, stale };
}

function okFetch(calls) {
  return async (url) => {
    calls.push(String(url));
    if (String(url).endsWith('/health')) return { ok: true, json: async () => ({}) };
    return { ok: true, json: async () => ({ accepted: 2 }) };
  };
}

test('словарь исходов закрыт и exit — тотальная функция от исхода', () => {
  assert.deepEqual([...OUTCOMES].sort(), Object.keys(OUTCOME_EXIT).sort());
  assert.equal(OUTCOME_EXIT.ok, 0);
  assert.equal(OUTCOME_EXIT['empty-day'], 0);
  assert.equal(OUTCOME_EXIT['office-unreachable'], 3);
});

test('ok: в extract идут только файлы дня, строка отчёта — контрактный снапшот без тел строк', async () => {
  const now = new Date('2026-08-13T19:00:00+03:00');
  const { dir } = makeTranscriptDir(now);
  const calls = [];
  const logs = [];
  try {
    const result = await runEveningStep({
      now,
      sources: [dir],
      baseUrl: 'https://office.test',
      token: 't',
      fetchImpl: okFetch(calls),
      sleep: async () => {},
      log: (l) => logs.push(l),
    });
    assert.equal(result.outcome, 'ok');
    // Фильтр дня: вчерашний файл не читался — files=1, спанов ровно два.
    // Границы TZ-устойчивы по построению: fresh=now (после локальной полуночи в
    // любой TZ), stale=now−24h (до неё в любой TZ) — литералов границы в тесте нет.
    const line = lineFor(result);
    assert.equal(line, 'archivarius-evening: files=1 spans=2 maskedLines=1 accepted=2');
    assert.equal(line, buildEveningLine(result.report), 'ok — единственный исход со строкой счётчиков');
    // Тела строк транскриптов не текут ни в строку отчёта, ни в лог шага.
    const all = [line, ...logs].join('\n');
    assert.ok(!all.includes(SECRET_MARKER), 'секрет из транскрипта попал в вывод шага');
    assert.ok(!all.includes('обычная реплика'), 'тело реплики попало в вывод шага');
    assert.ok(calls.some((u) => u.endsWith('/health')), 'health-предполёт не был вызван');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('empty-day: свежих файлов нет — сеть не трогается вовсе', async () => {
  const now = new Date('2026-08-13T19:00:00+03:00');
  const dir = mkdtempSync(join(tmpdir(), 'archivarius-evening-empty-'));
  mkdirSync(dir, { recursive: true });
  const calls = [];
  try {
    const result = await runEveningStep({
      now,
      sources: [dir],
      baseUrl: 'https://office.test',
      token: 't',
      fetchImpl: okFetch(calls),
    });
    assert.equal(result.outcome, 'empty-day');
    assert.equal(calls.length, 0, 'empty-day не должен ходить в сеть');
    // P1 ревью 13.08: empty-day читается СЛОВОМ, не нулями счётчиков.
    assert.equal(lineFor(result), 'archivarius-evening: skip outcome=empty-day (свежих файлов дня нет)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('office-unreachable: health мёртв — extract не запускается, скип назван', async () => {
  const now = new Date('2026-08-13T19:00:00+03:00');
  const { dir } = makeTranscriptDir(now);
  try {
    const result = await runEveningStep({
      now,
      sources: [dir],
      baseUrl: 'https://office.test',
      token: 't',
      fetchImpl: async () => {
        throw new Error('connect timeout');
      },
    });
    assert.equal(result.outcome, 'office-unreachable');
    assert.match(result.detail, /connect timeout/u);
    assert.equal(buildSkipLine(result.outcome, result.detail), `archivarius-evening: skip outcome=office-unreachable (${result.detail})`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('нет токена: исход office-unreachable с детализацией — ключ и сеть различимы словом', async () => {
  const now = new Date('2026-08-13T19:00:00+03:00');
  const { dir } = makeTranscriptDir(now);
  try {
    const result = await runEveningStep({
      now,
      sources: [dir],
      baseUrl: 'https://office.test',
      token: null,
      fetchImpl: async () => {
        throw new Error('сеть не должна вызываться без токена');
      },
    });
    assert.equal(result.outcome, 'office-unreachable');
    assert.match(result.detail, /OFFICE_API_TOKEN/u);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('partial не существует молча: отказ батча после ретраев — throw, не «ok с недоливом»', async () => {
  const now = new Date('2026-08-13T19:00:00+03:00');
  const { dir } = makeTranscriptDir(now);
  try {
    await assert.rejects(
      runEveningStep({
        now,
        sources: [dir],
        baseUrl: 'https://office.test',
        token: 't',
        sleep: async () => {},
        fetchImpl: async (url) => {
          if (String(url).endsWith('/health')) return { ok: true, json: async () => ({}) };
          return { ok: false, status: 502, json: async () => ({}) };
        },
      }),
      /502/u,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('filterFreshFiles: нечитаемый stat выпадает тихо, гонка ротации не валит вечер', () => {
  const since = startOfDay(new Date('2026-08-13T19:00:00+03:00'));
  const fresh = { mtimeMs: since.getTime() + 1000 };
  const files = filterFreshFiles(['a', 'b', 'c'], {
    since,
    statImpl: (p) => {
      if (p === 'b') throw new Error('ENOENT');
      return fresh;
    },
  });
  assert.deepEqual(files, ['a', 'c']);
});

test('checkOfficeHealth: не-2xx — отказ с кодом, не исключение', async () => {
  const res = await checkOfficeHealth({
    baseUrl: 'https://office.test/',
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  assert.deepEqual(res, { ok: false, detail: 'office HTTP 503' });
});
