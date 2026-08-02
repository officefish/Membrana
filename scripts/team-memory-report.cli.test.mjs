/**
 * Зубы проводки отчёта памяти (блок `report-surfacing-wire`).
 *
 * Охраняемый рубеж — граница сбора и суждения. CLI приносит ФАКТЫ журнала, именует их
 * чистый модуль. Если сюда просочится классификация, она окажется за файловой системой и
 * останется без зуба — ровно тот способ, каким проверки тихо перестают проверять.
 *
 * Файловой системы здесь нет: журнал подаётся текстом, как он лежит в `.jsonl`.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import { renderMemoryReport, parseMemoryDiff, classifySurfacing } from './lib/team-memory-report.mjs';
import { parseOpLog } from './persona-memory/lib/op-log.mjs';
import { summarizeSurfacing } from './team-memory-report.mjs';

const log = (...events) => events.map((e) => JSON.stringify(e)).join('\n') + '\n';
const ev = (verb, extra = {}) => ({ ts: '2026-08-02T10:00:00.000Z', persona: 'vesnin', verb, ...extra });

const summarize = (text) => summarizeSurfacing(parseOpLog(text).events);

test('импорт модуля не запускает прогон', () => {
  // До оговорки о прямом вызове импорт дёргал git по всему дереву и ДОПИСЫВАЛ отчёт дня в
  // docs/seanses. Проверяется отдельным процессом: в этом импорт уже случился, и судить по
  // нему было бы поздно.
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./scripts/team-memory-report.mjs')"], {
    cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1'),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(String(r.stdout), /всплывало сегодня/u, 'импорт напечатал отчёт — значит main() отработал');
});

test('сводка собирает факты и НЕ выносит суждения', () => {
  const s = summarize(log(ev('cloud_query', { ref: 'cloud-1' }), ev('emerge', { ref: 'rec-a', reason: 'к делу' })));
  assert.deepEqual(Object.keys(s).sort(), ['cloudQueries', 'invocations']);
  assert.equal('state' in s, false, 'состояние — предмет чистого модуля, не сборщика');
});

test('чужие глаголы журнала в сводку не попадают', () => {
  const s = summarize(
    log(
      ev('write_operational', { ref: 'x' }),
      ev('transfer_to_archive', { ref: 'y', reason: 'вытеснено' }),
      ev('rebuild_report', { ref: 'z' }),
      ev('surface_invoke', { ref: 'cloud-1' }),
      ev('cloud_query', { ref: 'cloud-1' }),
    ),
  );
  assert.equal(s.cloudQueries, 1);
  assert.deepEqual(s.invocations, [], 'surface_invoke — про показ, а не про акт персоны');
});

test('запросы считаются отдельно от актов: без этого пустое облако неотличимо от незваного лифта', () => {
  const empty = summarize(log(ev('cloud_query', { ref: 'c1' })));
  const never = summarize('');
  assert.equal(classifySurfacing(empty), 'empty-cloud');
  assert.equal(classifySurfacing(never), 'not-invoked');
});

test('объяснение персоны доезжает до сводки дословно', () => {
  const s = summarize(log(ev('cloud_query'), ev('emerge', { ref: 'rec-a', reason: 'участие против назначения' })));
  assert.deepEqual(s.invocations, [{ outcome: 'emerge', ref: 'rec-a', reason: 'участие против назначения' }]);
});

test('отказ доезжает с причиной и классифицируется отказом', () => {
  const s = summarize(log(ev('cloud_query'), ev('reject', { ref: 'cloud-1', reason: 'ни одна запись не по теме' })));
  assert.equal(classifySurfacing(s), 'rejected');
  assert.equal(s.invocations[0].reason, 'ни одна запись не по теме');
});

test('сквозной путь: журнал → сводка → отчёт, имя и причина на месте', () => {
  const diff = [
    '--- a/docs/virtual-team/memory/vesnin.md',
    '+++ b/docs/virtual-team/memory/vesnin.md',
    '+### 2026-08-02 · позиция · granica-modulya',
  ].join('\n');

  const { markdown } = renderMemoryReport(parseMemoryDiff(diff), {
    date: '2026-08-02',
    personas: ['vesnin'],
    surfacingByPersona: {
      vesnin: summarize(
        log(
          ev('cloud_query'),
          ev('surface_invoke'),
          ev('emerge', { ref: 'vesnin-2026-07-29-m1-performer', reason: 'участие против назначения' }),
        ),
      ),
    },
  });

  assert.match(markdown, /vesnin-2026-07-29-m1-performer ← архив \(участие против назначения\)/u);
  assert.ok(!markdown.includes('контур не поставлен'));
});

test('битая строка журнала не выдаётся за отсутствие всплытия', () => {
  // parseOpLog возвращает битые строки находкой, а не молчаливым пропуском; сводка считает
  // по тому, что разобралось, и не обязана додумывать неразобранное.
  const { events: entries, broken } = parseOpLog(`${JSON.stringify(ev('cloud_query'))}\nне json\n`);
  assert.ok(broken.length > 0, 'битая строка названа');
  assert.equal(summarizeSurfacing(entries).cloudQueries, 1);
});

test('порядок всплывшего берётся из журнала, а не из случайности', () => {
  const s = summarize(
    log(
      ev('cloud_query'),
      ev('emerge', { ref: 'первое', reason: 'раз' }),
      ev('emerge', { ref: 'второе', reason: 'два' }),
      ev('emerge', { ref: 'третье', reason: 'три' }),
    ),
  );
  assert.deepEqual(s.invocations.map((i) => i.ref), ['первое', 'второе', 'третье']);
});
