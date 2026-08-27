/**
 * Зубы достоверности архива охоты (вердикт M2 заседания `hunt-and-canon`).
 *
 * Порча здесь — не украшение: прежний архиватор был ЗЕЛЁН полтора месяца, штампуя
 * папку из июльского отчёта. Значит зуб обязан краснеть ровно на том, что тогда
 * проходило молча: вчерашний источник под сегодняшней датой.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  classifySources,
  evidenceClassOf,
  localDayKey,
  parseBornAt,
  refusalLine,
  veracity,
} from './lib/night-hunt-veracity.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(REPO, 'scripts', 'archive-night-hunt-artifacts.mjs');

/** Отчёт охоты с заданным маркером рождения. */
function report(bornAtIso, body = 'тело') {
  return `# Night Hunt: design-token-drift

| Поле | Значение |
|------|----------|
| Week | 2026-35 |
| Generated (UTC) | ${bornAtIso} |

${body}
`;
}

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'hunt-veracity-'));
  mkdirSync(join(dir, 'docs', 'seanses', 'night-hunt'), { recursive: true });
  return dir;
}

/** Прогон скрипта в песочнице: возвращает код и stderr, а не бросает. */
function run(cwd, args = []) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out: stdout, err: '' };
  } catch (err) {
    return {
      code: typeof err?.status === 'number' ? err.status : 1,
      out: String(err?.stdout ?? ''),
      err: String(err?.stderr ?? ''),
    };
  }
}

test('маркер рождения: есть / нет / нечитаем — три разных исхода, не два', () => {
  assert.equal(parseBornAt(report('2026-08-27T06:00:00.000Z')).bornAt, '2026-08-27T06:00:00.000Z');
  assert.equal(parseBornAt('# отчёт без шапки').reason, 'missing_marker');
  assert.equal(parseBornAt(report('позавчера')).reason, 'parse_error');
});

test('V(s,d): рождение в дне архивации — вещдок; вчерашнее — отказ с названной разницей', () => {
  const now = new Date('2026-08-27T20:00:00.000Z');
  const day = localDayKey(now);

  const fresh = veracity({ bornAt: now.toISOString(), day, now });
  assert.equal(fresh.fresh, true);
  assert.equal(evidenceClassOf(fresh), 'exhibit');

  const yesterday = new Date(now.getTime() - 24 * 3_600_000);
  const stale = veracity({ bornAt: yesterday.toISOString(), day, now });
  assert.equal(stale.fresh, false);
  assert.equal(stale.reason, 'refused_stale');
  assert.equal(evidenceClassOf(stale), 'copy_not_exhibit');
  assert.ok(stale.ageHours >= 23 && stale.ageHours <= 25, `возраст назван: ${stale.ageHours}`);
});

test('ПОРЧА КЛАССА: июльский отчёт под августовской датой — отказ, а не «ночь жизни»', () => {
  // Точная фактура находки: файл рождён 12.07, папка датирована 23.08.
  const now = new Date('2026-08-23T20:00:00.000Z');
  const v = veracity({ bornAt: '2026-07-12T12:47:56.410Z', day: localDayKey(now), now });
  assert.equal(v.fresh, false, 'полтора месяца это проходило молча — зуб обязан краснеть');
  const line = refusalLine({ name: 'design-drift-2026-28.md', verity: v }, '2026-08-23');
  assert.match(line, /рождён 2026-07-12/u, 'отказ называет, ЧТО протухло');
  assert.match(line, /старше на 42 сут/u, 'отказ называет, НАСКОЛЬКО');
});

test('отказ называет три вещи: что протухло, насколько и что делать', () => {
  const now = new Date('2026-08-27T20:00:00.000Z');
  const day = localDayKey(now);
  const v = veracity({ bornAt: '2026-08-25T06:00:00.000Z', day, now });
  const line = refusalLine({ name: 'x.md', verity: v }, day);
  assert.match(line, /рождён/u);
  assert.match(line, /старше на/u);
  assert.match(line, /охота за эту ночь не ходила/u);

  const noMarker = refusalLine({ name: 'y.md', verity: veracity({ bornAt: null, reason: 'missing_marker', day }) }, day);
  assert.match(noMarker, /проверить генератор охоты/u, 'выход назван, а не «что-то не так»');
});

test('classifySources делит на вещдоки и копии, копии не теряются', () => {
  const now = new Date('2026-08-27T20:00:00.000Z');
  const day = localDayKey(now);
  const { exhibits, refused } = classifySources(
    [
      { name: 'свежий.md', content: report(now.toISOString()) },
      { name: 'протухший.md', content: report('2026-07-12T12:47:56.410Z') },
    ],
    { day, now },
  );
  assert.deepEqual(exhibits.map((e) => e.name), ['свежий.md']);
  assert.deepEqual(refused.map((e) => e.name), ['протухший.md']);
});

test('ЖИВОЙ ПРОГОН · порча: вчерашний источник под сегодняшней датой → exit 3, папки нет', () => {
  const dir = sandbox();
  const yesterday = new Date(Date.now() - 26 * 3_600_000).toISOString();
  writeFileSync(join(dir, 'docs/seanses/night-hunt/design-drift.md'), report(yesterday), 'utf8');

  const res = run(dir);
  assert.equal(res.code, 3, 'отказ — находка (3), не поломка (1) и не молчаливое ok (0)');
  assert.match(res.err, /ОТКАЗ/u);
  assert.match(res.err, /вещдок/iu);
  assert.equal(
    existsSync(join(dir, 'docs/archive/night-hunt')),
    false,
    'ГЛАВНОЕ: датированная папка НЕ создана — чеканить ложь нечем',
  );
});

test('ЖИВОЙ ПРОГОН · свежий источник → папка создана как раньше, манифест несёт разбор', () => {
  const dir = sandbox();
  writeFileSync(
    join(dir, 'docs/seanses/night-hunt/design-drift.md'),
    report(new Date().toISOString()),
    'utf8',
  );

  const res = run(dir);
  assert.equal(res.code, 0, `свежий источник обязан пройти как раньше: ${res.err}`);

  const day = localDayKey(new Date());
  const destDir = join(dir, 'docs/archive/night-hunt', day);
  assert.ok(existsSync(join(destDir, 'design-drift.md')), 'отчёт скопирован');

  const manifest = JSON.parse(readFileSync(join(destDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.evidenceClass, 'exhibit');
  assert.equal(manifest.entries.length, 1);
  assert.ok(manifest.entries[0].bornAt, 'манифест несёт bornAt');
  assert.match(manifest.entries[0].contentHash, /^[0-9a-f]{64}$/u, 'манифест несёт contentHash');
  assert.equal(manifest.entries[0].evidenceClass, 'exhibit');
});

test('ЖИВОЙ ПРОГОН · пустой источник → отказ missing_source, а не молчаливый ноль', () => {
  const dir = sandbox();
  const res = run(dir);
  assert.equal(res.code, 3, 'раньше это был exit 0 «пропуск» — молчание о том, что охоты нет');
  assert.match(res.err, /missing_source/u);
});

test('ЖИВОЙ ПРОГОН · --mark-tainted метит старые папки и НЕ трогает сами отчёты', () => {
  const dir = sandbox();
  const oldDay = '2026-08-23';
  const oldDir = join(dir, 'docs/archive/night-hunt', oldDay);
  mkdirSync(oldDir, { recursive: true });
  const body = report('2026-07-12T12:47:56.410Z');
  writeFileSync(join(oldDir, 'design-drift-2026-28.md'), body, 'utf8');
  writeFileSync(
    join(oldDir, 'manifest.json'),
    JSON.stringify({ day: oldDay, files: ['design-drift-2026-28.md'], archivedAt: '2026-08-23T13:27:47.750Z' }, null, 2),
    'utf8',
  );

  const res = run(dir, ['--mark-tainted']);
  assert.equal(res.code, 0, res.err);

  const manifest = JSON.parse(readFileSync(join(oldDir, 'manifest.json'), 'utf8'));
  assert.equal(manifest.evidenceClass, 'copy_not_exhibit', 'папка объявлена копией, а не вещдоком');
  assert.equal(manifest.entries[0].bornAt, '2026-07-12T12:47:56.410Z');
  assert.equal(manifest.archivedAt, '2026-08-23T13:27:47.750Z', 'прежнее поле сохранено — оно было честным');
  assert.equal(
    readFileSync(join(oldDir, 'design-drift-2026-28.md'), 'utf8'),
    body,
    'сам отчёт задним числом НЕ переписан',
  );
  assert.equal(readdirSync(oldDir).length, 2, 'папка не вычищена — она улика класса');
});
