/**
 * Зуб слияния ленты снимков (блок history-merge, 10.09).
 *
 * Красный вход дня: две ветки пишут замер за ОДИН момент, союзное слияние даёт двойника.
 * Проверяем не «драйвер что-то делает», а что именно тот случай перестал портить ленту.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { measureKey, mergeHistories, parseHistory, renderHistory } from './lib/history-merge.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOST = 'DESKTOP-610UJVH';
const measure = (at, extra = {}) => ({ at, host: HOST, summary: { dominant: 'ok' }, ...extra });

/** То, что делал встроенный union: склеить обе стороны как строки. */
const unionLike = (ours, theirs) => [...ours, ...theirs];

test('КРАСНЫЙ ВХОД: две ветки пишут замер за один момент — союз даёт двойника', () => {
  const shared = measure('2026-09-09T08:12:45.758Z');
  const ours = [shared, measure('2026-09-09T10:00:00.000Z')];
  const theirs = [shared, measure('2026-09-09T09:00:00.000Z')];

  // Сначала фиксируем саму беду: союз действительно рождает точный повтор.
  const union = unionLike(ours, theirs);
  assert.equal(union.filter((e) => e.at === shared.at).length, 2, 'вещдок: союз повторил момент');

  const merged = mergeHistories([shared], ours, theirs);
  assert.equal(merged.entries.filter((e) => e.at === shared.at).length, 1, 'двойник обязан сняться');
  assert.equal(merged.duplicates, 1);
  assert.equal(merged.entries.length, 3, 'три разных замера — три строки');
});

test('порядок времени восстанавливается, как бы ни легли стороны', () => {
  const ours = [measure('2026-09-09T10:00:00.000Z'), measure('2026-09-09T08:00:00.000Z')];
  const theirs = [measure('2026-09-09T09:00:00.000Z')];
  const { entries } = mergeHistories([], ours, theirs);
  assert.deepEqual(
    entries.map((e) => e.at),
    ['2026-09-09T08:00:00.000Z', '2026-09-09T09:00:00.000Z', '2026-09-09T10:00:00.000Z'],
  );
});

test('один момент, РАЗНЫЕ машины — два замера, а не двойник', () => {
  const at = '2026-09-09T08:00:00.000Z';
  const { entries, duplicates } = mergeHistories([], [measure(at)], [{ ...measure(at), host: 'media-nl' }]);
  assert.equal(entries.length, 2, 'машина — часть ключа замера');
  assert.equal(duplicates, 0);
  assert.notEqual(measureKey(entries[0]), measureKey(entries[1]));
});

test('один момент записан сторонами ПО-РАЗНОМУ — факт назван, не замолчан', () => {
  const at = '2026-09-09T08:00:00.000Z';
  const r = mergeHistories([], [measure(at, { verdict: 'ok' })], [measure(at, { verdict: 'red' })]);
  assert.equal(r.entries.length, 1);
  assert.deepEqual(r.redefined, [`${at}::${HOST}`], 'расхождение обязано быть названо');
  assert.equal(r.entries[0].verdict, 'ok', 'берётся наша сторона — детерминированно');
});

test('ни один замер не теряется: то, ради чего слияние вообще нужно', () => {
  const ours = [measure('2026-09-09T08:00:00.000Z'), measure('2026-09-09T09:00:00.000Z')];
  const theirs = [measure('2026-09-09T10:00:00.000Z'), measure('2026-09-09T11:00:00.000Z')];
  const { entries, added } = mergeHistories([ours[0]], ours, theirs);
  assert.equal(entries.length, 4);
  assert.equal(added, 3, 'три замера новых против предка');
  for (const e of [...ours, ...theirs]) {
    assert.ok(entries.some((x) => measureKey(x) === measureKey(e)), `замер ${e.at} потерян`);
  }
});

test('битая строка — ошибка входа, а не молчаливый пропуск', () => {
  const r = parseHistory('{"at":"2026-09-09T08:00:00.000Z","host":"x"}\n{битое}\n');
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /строка 2/u);
});

test('замер без момента не принимается: его некуда поставить в ряду', () => {
  const r = parseHistory('{"host":"x","summary":{}}\n');
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /без момента/u);
});

test('драйвер целиком: git зовёт %O %A %B, результат ложится в %A', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nethist-'));
  const shared = measure('2026-09-09T08:12:45.758Z');
  const base = join(dir, 'base.jsonl');
  const ours = join(dir, 'ours.jsonl');
  const theirs = join(dir, 'theirs.jsonl');
  writeFileSync(base, renderHistory([shared]));
  writeFileSync(ours, renderHistory([shared, measure('2026-09-09T10:00:00.000Z')]));
  writeFileSync(theirs, renderHistory([shared, measure('2026-09-09T09:00:00.000Z')]));

  execFileSync('node', [join(repoRoot, 'scripts/network/history-merge.mjs'), base, ours, theirs], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const out = parseHistory(readFileSync(ours, 'utf8'));
  assert.ok(out.ok);
  assert.equal(out.entries.length, 3, 'двойник снят, замеры целы');
  assert.deepEqual(
    out.entries.map((e) => e.at),
    ['2026-09-09T08:12:45.758Z', '2026-09-09T09:00:00.000Z', '2026-09-09T10:00:00.000Z'],
  );
});

test('лента выведена из-под союза и привязана к своему драйверу', () => {
  const attrs = readFileSync(join(repoRoot, '.gitattributes'), 'utf8');
  assert.match(attrs, /docs\/network\/history\/\*\*\/\*\.jsonl merge=network-history/u);
  assert.doesNotMatch(
    attrs,
    /docs\/network\/history\/\*\*\/\*\.jsonl merge=union/u,
    'ПОРЧА: лента снова под союзом — двойники вернутся',
  );
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.prepare, /merge\.network-history\.driver/u, 'драйвер не регистрируется');
});
