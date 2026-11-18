/**
 * Тесты входа «канон ствола за 7 дней» вечернего протокола (#2682). LLM не вызывается;
 * git — инъекцией, кроме последнего живого теста по стволу репозитория.
 *
 * CANON_CHANGES_7D в readAt НЕ обязательный ключ: `validateEveningFeedbackReadAt` судит
 * `EVENING_REQUIRED_KEYS` (три вечерних документа), и протоколы до #2682 этого ключа не несут —
 * сделать его обязательным значило бы задним числом обесценить их гарантии. Тест ниже держит
 * обе стороны: лишний ключ не ломает предикат, а обязательные ключи судятся как прежде.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANON_PATHSPECS,
  CANON_READAT_KEY,
  canonChangesDigest,
  collectCanonChanges,
  formatCanonChangesBlock,
  parseCanonLog,
  windowStart,
} from './evening-canon-changes.mjs';
import {
  buildEveningFeedbackUserMessage,
  EVENING_REQUIRED_KEYS,
  parseEveningFeedbackGuard,
  validateEveningFeedbackReadAt,
} from './team-evening-feedback-ritual.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Вывод git log в форме сборщика: вещдок 05.10 (ADR-0031 добавлен #2593, правлен #2594). */
const LOG = [
  '@@1cf33715aaaa\t2026-10-05T18:00:00+03:00\tfeat(media): архив понижения (b2 #2587) (#2594)',
  'M\tdocs/adr/ADR-0031-downgrade-archive.md',
  '@@66153f58bbbb\t2026-10-05T12:00:00+03:00\tfeat(plugin-handlers): selectKeepWithinBytes (b1 #2587) (#2593)',
  'A\tdocs/adr/ADR-0031-downgrade-archive.md',
  'M\tdocs/adr/README.md',
  '@@5b4ce120cccc\t2026-09-29T10:00:00+03:00\tfix(studio): sync flush (#2508)',
  'R100\tdocs/adr/old-name.md\tdocs/adr/ADR-0030-scenario-trace-run-evidence.md',
].join('\n');

test('windowStart: 7 дней назад от дня протокола', () => {
  assert.equal(windowStart('2026-10-06'), '2026-09-29');
  assert.throws(() => windowStart('вчера'), /неверный день/u);
});

test('parseCanonLog: последнее изменение — главное; добавление в окне — рядом; переименование — по новому пути', () => {
  const e = parseCanonLog(LOG);
  const adr = e.find((x) => x.path === 'docs/adr/ADR-0031-downgrade-archive.md');
  assert.equal(adr.status, 'M');
  assert.equal(adr.sha, '1cf33715aaaa');
  assert.deepEqual(adr.added, { sha: '66153f58bbbb', at: '2026-10-05T12:00:00+03:00' });
  assert.equal(e.find((x) => x.path.endsWith('ADR-0030-scenario-trace-run-evidence.md'))?.status, 'R');
  assert.equal(e.length, 3);
});

test('блок: путь, sha, дата и запрет утверждать отсутствие названного', () => {
  const block = formatCanonChangesBlock({ entries: parseCanonLog(LOG), sinceDay: '2026-09-29', ref: 'origin/main', head: 'abcdef1234' });
  assert.match(block, /за 7 дней \(с 2026-09-29, origin\/main @abcdef12\)/u);
  assert.match(
    block,
    /`docs\/adr\/ADR-0031-downgrade-archive\.md` — изменён 2026-10-05, 1cf33715 \(добавлен в окне 2026-10-05, 66153f58\)/u,
  );
  assert.match(block, /нельзя/u);
});

test('блок: пусто и нечитаемый ствол — словами, не молчанием', () => {
  assert.match(formatCanonChangesBlock({ entries: [], sinceDay: 'x', ref: 'HEAD' }), /канон в стволе не менялся/u);
  assert.match(
    formatCanonChangesBlock({ entries: null, sinceDay: 'x', ref: 'HEAD', error: 'fatal: bad revision' }),
    /ствол не прочитан: fatal: bad revision\) — утверждения об отсутствии канона в протоколе не делать/u,
  );
});

test('отпечаток: тот же список — тот же; другой sha — другой', () => {
  const e = parseCanonLog(LOG);
  assert.equal(canonChangesDigest(e), canonChangesDigest(parseCanonLog(LOG)));
  const other = e.map((x, i) => (i === 0 ? { ...x, sha: 'ffff' } : x));
  assert.notEqual(canonChangesDigest(e), canonChangesDigest(other));
});

test('collectCanonChanges: ствол — origin/main, окно [день-7; конец дня], канон-пути; readAt с версией и временем вершины', () => {
  const calls = [];
  const git = (args) => {
    calls.push(args);
    if (args[0] === 'rev-parse') return { ok: true, out: 'deadbeef\n' };
    if (args[0] === 'log' && args[1] === '-1') return { ok: true, out: 'headsha123\t2026-10-06T20:00:00+03:00\n' };
    return { ok: true, out: LOG };
  };
  const c = collectCanonChanges({ git, today: '2026-10-06' });
  const log = calls.find((a) => a.includes('--name-status'));
  assert.equal(log[1], 'origin/main');
  assert.ok(log.includes('--since=2026-09-29T00:00:00Z'));
  assert.ok(log.includes('--until=2026-10-06T23:59:59Z'), 'без верхней границы прошлый день видит будущее');
  assert.deepEqual(log.slice(log.indexOf('--') + 1), [...CANON_PATHSPECS]);
  assert.equal(c.entries.length, 3);
  assert.deepEqual(c.readAtEntry, {
    version: 'headsha123',
    digest: canonChangesDigest(c.entries),
    versionAt: '2026-10-06T20:00:00+03:00',
  });
});

test('collectCanonChanges: нет origin/main — HEAD; git упал — блок говорит, отпечатка нет', () => {
  const git = (args) => (args[0] === 'rev-parse' ? { ok: false, out: '' } : { ok: false, out: 'fatal: not a git repository' });
  const c = collectCanonChanges({ git, today: '2026-10-06' });
  assert.equal(c.ref, 'HEAD');
  assert.equal(c.readAtEntry.digest, null);
  assert.match(c.block, /ствол не прочитан: fatal: not a git repository/u);
});

test('сообщение команде: блок канона стоит ДО документов дня; без блока сообщение прежнее', () => {
  const base = { regulation: 'R', prompt: 'P', virtualTeam: 'V', dayDocs: 'DOCS', gitSummary: 'G', date: new Date('2026-10-06T12:00:00Z') };
  const withCanon = buildEveningFeedbackUserMessage({ ...base, canonChangesBlock: '## Канон, изменённый' });
  assert.ok(withCanon.indexOf('## Канон, изменённый') < withCanon.indexOf('## Документы дня'));
  assert.ok(!buildEveningFeedbackUserMessage(base).includes('Канон, изменённый'));
});

test('readAt: CANON_CHANGES_7D едет в guard-строке и не ломает validateEveningFeedbackReadAt', () => {
  const docs = Object.fromEntries(EVENING_REQUIRED_KEYS.map((k) => [k, { version: 'v', digest: `d-${k}` }]));
  const readAt = { ...docs, [CANON_READAT_KEY]: { version: 'headsha', digest: 'canon-digest' } };
  const guardLine = `<!-- evening-feedback ${JSON.stringify({ day: '2026-10-06', readAt })} -->`;
  const parsed = parseEveningFeedbackGuard(guardLine);
  assert.deepEqual(parsed.readAt[CANON_READAT_KEY], { version: 'headsha', digest: 'canon-digest' });
  assert.deepEqual(validateEveningFeedbackReadAt({ readAt: parsed.readAt, current: docs }), { ok: true, failures: [] });
  // обязательные ключи судятся по-прежнему: порча одного отпечатка — красный
  const broken = { ...docs, DAILY_AUDIT: { version: 'v', digest: 'другой' } };
  assert.equal(validateEveningFeedbackReadAt({ readAt: parsed.readAt, current: broken }).ok, false);
});

test('живой: на день 06.10 вход называет ADR-0031 — то, чего команда тогда не видела', () => {
  const git = (args) => {
    try {
      return { ok: true, out: execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) };
    } catch (e) {
      return { ok: false, out: String(e?.stderr ?? e?.message ?? '') };
    }
  };
  const shallow = git(['rev-parse', '--is-shallow-repository']).out.trim() === 'true';
  const c = collectCanonChanges({ git, today: '2026-10-06' });
  if (shallow) {
    // shallow-клон не несёт истории окна — честно: ствол прочитан, список может быть пуст
    assert.ok(c.block.includes('Канон, изменённый'));
    return;
  }
  const adr = c.entries.find((e) => e.path === 'docs/adr/ADR-0031-downgrade-archive.md');
  assert.ok(adr, c.block);
  assert.equal(adr.added?.sha?.slice(0, 8), '66153f58');
  assert.ok(c.entries.every((e) => e.at.slice(0, 10) <= '2026-10-06'), 'в окно попало будущее');
});
