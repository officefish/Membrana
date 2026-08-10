import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_RETENTION_POLICY,
  KNOWN_SCHEMA_VERSIONS,
  MANIFEST_SCHEMA_VERSION,
  RETENTION_REASONS,
  INVENTORY_SOURCES,
  SHA256_SUBJECTS,
  formatArtifactName,
  isFitForRetention,
  manifestProblems,
  parseArtifactName,
  planRetention,
  toBasicUtc,
} from './lib/mongo-dump-policy.mjs';

const SHA = 'a'.repeat(64);
const SHA2 = 'b'.repeat(64);

/** Пригодный манифест (форма v2, #1814). Зубы портят ОДНО поле за раз — иначе непонятно, что именно поймал зуб. */
const manifest = (over = {}) => ({
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  startedAt: '2026-08-08T16:16:31.042Z',
  finishedAt: '2026-08-08T16:18:02.000Z',
  mongoVersion: '7.0.14',
  sourceHost: 'office-vds',
  mongodumpExitCode: 0,
  sha256: SHA,
  sha256Of: 'gzip-stream',
  inventorySource: 'archive-contents',
  protocolChecks: { incompleteCollections: [] },
  sizeBytes: 4_194_304,
  dbInventory: [{ db: 'membrana_archivarius', collection: 'spans', documentCount: 106_233 }],
  ...over,
});

/** Манифест ФОРМЫ v1 — дословная форма живых манифестов 09.08: ретенция обязана читать их вечно. */
const manifestV1 = (over = {}) => {
  const { protocolChecks: _drop, ...v2 } = manifest();
  return { ...v2, schemaVersion: 1, inventorySource: 'mongodump-stderr', incompleteCollections: [], ...over };
};

const artifact = (startedAt, over = {}, sha = SHA) => ({
  name: formatArtifactName({ startedAt, mongoVersion: '7.0.14', sha256: sha }),
  manifest: manifest({ startedAt, finishedAt: startedAt, sha256: sha, ...over }),
});

test('имя: UTC, базовый ISO, миллисекунды — сортировка строк совпадает с хронологией', () => {
  assert.equal(toBasicUtc('2026-08-08T16:16:31.042Z'), '20260808T161631042Z');
  // Тот же момент, записанный в другом поясе, обязан дать ТУ ЖЕ строку: иначе перевод
  // пояса на сервере заставит сортировку по имени соврать.
  assert.equal(toBasicUtc('2026-08-08T19:16:31.042+03:00'), '20260808T161631042Z');

  const earlier = formatArtifactName({ startedAt: '2026-08-07T23:59:59.999Z', mongoVersion: '7.0.14', sha256: SHA });
  const later = formatArtifactName({ startedAt: '2026-08-08T00:00:00.000Z', mongoVersion: '7.0.14', sha256: SHA });
  assert.ok(earlier < later, 'лексикографический порядок имён обязан совпасть с хронологическим');
});

test('имя: два прогона в одну секунду не сталкиваются — миллисекунды не декоративны', () => {
  const a = formatArtifactName({ startedAt: '2026-08-08T16:16:31.001Z', mongoVersion: '7.0.14', sha256: SHA });
  const b = formatArtifactName({ startedAt: '2026-08-08T16:16:31.999Z', mongoVersion: '7.0.14', sha256: SHA });
  assert.notEqual(a, b, 'коллизия имён = тихая перезапись копии копией');
});

test('имя ↔ разбор: круговой прогон возвращает исходные значения', () => {
  const name = formatArtifactName({ startedAt: '2026-08-08T16:16:31.042Z', mongoVersion: '7.0.14', sha256: SHA });
  assert.equal(name, `mongo-dump--20260808T161631042Z--7.0.14--${SHA.slice(0, 8)}.archive.gz`);
  const p = parseArtifactName(name);
  assert.equal(p.ok, true);
  assert.equal(p.startedAt, '2026-08-08T16:16:31.042Z');
  assert.equal(p.mongoVersion, '7.0.14');
  assert.equal(p.shortSha, SHA.slice(0, 8));
  assert.equal(p.gzip, true);
});

test('имя проверяемо против манифеста без внешнего индекса', () => {
  const m = manifest();
  const p = parseArtifactName(formatArtifactName({ startedAt: m.startedAt, mongoVersion: m.mongoVersion, sha256: m.sha256 }));
  assert.equal(p.shortSha, m.sha256.slice(0, 8), 'рассогласование обязано быть видно сравнением двух полей');
});

test('разбор имени возвращает состояние, а не бросает: чужой файл в каталоге — норма', () => {
  for (const bad of ['dump.gz', '', 'mongo-dump--20260808T1616Z--7.0.14--aaaaaaaa.archive', null]) {
    const r = parseArtifactName(bad);
    assert.equal(r.ok, false, `«${String(bad)}» не имя артефакта`);
    assert.ok(r.problem.length > 0);
  }
});

test('манифест — предикат: «файл создан, размер ненулевой» проверкой не является', () => {
  assert.deepEqual(manifestProblems(manifest()), []);
  assert.equal(isFitForRetention(manifest()), true);

  // Каждая строка — отдельный способ соврать «копия есть».
  const cases = [
    [{ mongodumpExitCode: 1 }, 'файл есть, но mongodump упал'],
    [{ dbInventory: [] }, 'пустой дамп живой базы неотличим от полного'],
    [{ sizeBytes: 12 }, 'обрезанный файл ниже пола'],
    [{ sha256Of: 'файл целиком' }, 'субъект хеша вне закрытого списка'],
    [{ sha256: 'нехеш' }, 'sha256 не хеш'],
    [{ schemaVersion: 99 }, 'неизвестная версия схемы — не «наверное сойдёт»'],
    [{ finishedAt: '2026-08-08T16:00:00.000Z' }, 'финиш раньше старта'],
    [{ sourceHost: '' }, 'источник не назван'],
    [{ dbInventory: [{ db: 'x', collection: 'y' }] }, 'опись без documentCount'],
    [{ inventorySource: 'на глазок' }, 'источник описи вне закрытого списка'],
    [{ inventorySource: undefined }, 'источник описи не назван вовсе'],
    [{ inventorySource: 'mongodump-stderr' }, 'v2 со stderr-источником — возврат долга #1814 через чёрный ход'],
    [{ protocolChecks: { incompleteCollections: ['membrana_archivarius.spans'] } }, 'начата и не дописана — неполный дамп при нулевом коде возврата'],
    [{ protocolChecks: { incompleteCollections: 'нет' } }, 'неполнота протокола не проверена'],
    [{ protocolChecks: undefined }, 'гарда протокола нет вовсе'],
    [{ incompleteCollections: [] }, 'поле v1 на верхнем уровне v2 — оси форм не смешиваются'],
  ];
  for (const [over, why] of cases) {
    assert.ok(manifestProblems(manifest(over)).length > 0, why);
  }
  assert.deepEqual(manifestProblems(null), ['манифест не объект — читать нечего']);
});

test('совместимость: манифест ФОРМЫ v1 (живые 09.08) остаётся пригодным для ретенции вечно', () => {
  assert.deepEqual(manifestProblems(manifestV1()), []);
  assert.equal(isFitForRetention(manifestV1()), true, 'ветка валидации по schemaVersion, история не краснеет');
  // И его собственный гард продолжает работать по-старому.
  assert.ok(manifestProblems(manifestV1({ incompleteCollections: ['membrana_archivarius.spans'] })).length > 0);
  assert.ok(manifestProblems(manifestV1({ incompleteCollections: 'нет' })).length > 0);
});

test('ретенция детерминирована: now параметром, а не Date.now() внутри', () => {
  const arts = [artifact('2026-08-08T00:00:00.000Z')];
  const a = planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts: arts });
  const b = planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts: arts });
  assert.deepEqual(a, b);
  // И меняется от времени — иначе «детерминизм» был бы просто неработающей функцией.
  const later = planRetention({ now: '2026-10-01T00:00:00.000Z', artifacts: arts });
  assert.notDeepEqual(a.reasons, later.reasons);
});

test('инварианты ретенции держатся на смешанном каталоге', () => {
  const artifacts = [
    artifact('2026-08-08T00:00:00.000Z'),
    artifact('2026-08-07T00:00:00.000Z', {}, SHA2),
    artifact('2026-06-01T00:00:00.000Z', {}, 'c'.repeat(64)),
    artifact('2026-08-06T00:00:00.000Z', { mongodumpExitCode: 1 }, 'd'.repeat(64)),
    { name: 'посторонний.tar.gz', manifest: null },
  ];
  const { keep, drop, reasons } = planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts });

  const names = artifacts.map((a) => a.name);
  assert.deepEqual([...keep, ...drop].sort(), [...names].sort(), 'keep ∪ drop = artifacts');
  assert.equal(keep.filter((n) => drop.includes(n)).length, 0, 'keep ∩ drop = ∅');
  for (const n of names) {
    assert.ok(RETENTION_REASONS.includes(reasons[n]), `причина «${reasons[n]}» вне закрытого перечня`);
  }
  assert.equal(reasons['посторонний.tar.gz'], 'dropped:corrupt-manifest');
  assert.equal(reasons[artifacts[3].name], 'dropped:corrupt-manifest', 'упавший mongodump не хранится как копия');
});

test('пол: вырожденная политика не может оставить ноль копий', () => {
  // Политика задана ЯВНО и нарочно вырожденной: уровни занулены. При DEFAULT_RETENTION_POLICY
  // эта ветка недостижима (minCount: 7 удержит свежайшую раньше), и зуб не притворяется, будто
  // достижима, — пол страхует от политики, а не от возраста.
  const artifacts = [artifact('2025-01-01T00:00:00.000Z')];
  const degenerate = { tiers: [{ maxAgeHours: 0, minCount: 0 }], hardCap: 14, minSizeBytes: 1024 };
  const { keep, drop, reasons } = planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts, policy: degenerate });
  assert.deepEqual(keep, [artifacts[0].name], 'ретенция, оставляющая ноль копий, — отложенная потеря данных');
  assert.deepEqual(drop, []);
  assert.equal(reasons[artifacts[0].name], 'kept:hard-floor');
});

test('пол при политике по умолчанию НЕДОСТИЖИМ — и это утверждение, а не умолчание', () => {
  // Если однажды default изменят так, что свежайшая копия перестанет удерживаться уровнями,
  // зуб покраснеет и потребует объяснить смену смысла, а не тихо сменит причину в отчёте.
  const artifacts = [artifact('2025-01-01T00:00:00.000Z')];
  const { reasons } = planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts });
  assert.equal(reasons[artifacts[0].name], 'kept:min-count');
});

test('противоречивая политика падает громко: hardCap ниже minCount съел бы уровни молча', () => {
  assert.throws(
    () => planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts: [], policy: { tiers: [{ maxAgeHours: 168, minCount: 7 }], hardCap: 3 } }),
    /противоречит себе/u,
  );
  assert.throws(() => planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts: [], policy: {} }), /не политика/u);
});

test('пол не срабатывает вхолостую: при живом окне причина именно оконная', () => {
  const artifacts = [artifact('2026-08-08T00:00:00.000Z')];
  const { reasons } = planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts });
  assert.equal(reasons[artifacts[0].name], 'kept:within-daily-window');
});

test('пол не воскрешает битую копию — хранить нечего, и это надо видеть', () => {
  const artifacts = [artifact('2025-01-01T00:00:00.000Z', { mongodumpExitCode: 1 })];
  const { keep, drop } = planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts });
  assert.deepEqual(keep, [], 'пол держит последнюю ПРИГОДНУЮ, а не последний файл');
  assert.deepEqual(drop, [artifacts[0].name]);
});

test('hardCap режет по количеству, начиная с самых старых', () => {
  const artifacts = Array.from({ length: 20 }, (_, i) =>
    artifact(new Date(Date.parse('2026-08-08T00:00:00.000Z') - i * 3600_000).toISOString(), {}, String(i % 10).repeat(64)),
  );
  const { keep, drop, reasons } = planRetention({ now: '2026-08-08T01:00:00.000Z', artifacts });
  assert.equal(keep.length, DEFAULT_RETENTION_POLICY.hardCap);
  assert.equal(drop.length, 20 - DEFAULT_RETENTION_POLICY.hardCap);
  // Уходят именно старшие: hardCap про «сколько свежих оставить», а не «каких».
  const oldest = artifacts[19].name;
  assert.ok(drop.includes(oldest), 'обрезание обязано начинаться со старых');
  assert.equal(reasons[oldest], 'dropped:over-hard-cap');
});

test('minCount держит седьмую копию, даже когда окно её уже не держит', () => {
  // Восемь копий с шагом в сутки; окно 168 ч накрывает семь из них по возрасту.
  const artifacts = Array.from({ length: 8 }, (_, i) =>
    artifact(new Date(Date.parse('2026-08-08T00:00:00.000Z') - i * 24 * 3600_000).toISOString(), {}, String(i).repeat(64)),
  );
  const { keep, reasons } = planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts });
  assert.equal(keep.length, 7, 'семь суточных — прямое следствие окна потери «сутки»');
  assert.equal(reasons[artifacts[7].name], 'dropped:superseded-by-newer', 'восьмая вытеснена, а не «пропала»');
});

test('пустой каталог — не ошибка и не молчаливая зелёнка', () => {
  const r = planRetention({ now: '2026-08-08T12:00:00.000Z', artifacts: [] });
  assert.deepEqual(r, { keep: [], drop: [], reasons: {} });
});

test('нечитаемое now и не-массив падают громко, а не считают мусор', () => {
  assert.throws(() => planRetention({ now: 'вчера', artifacts: [] }), /now не читается/u);
  assert.throws(() => planRetention({ now: '2026-08-08T00:00:00Z', artifacts: null }), /artifacts не массив/u);
  assert.throws(() => formatArtifactName({ startedAt: '2026-08-08T00:00:00Z', mongoVersion: '7--0', sha256: SHA }), /непригодна/u);
  assert.throws(() => formatArtifactName({ startedAt: '2026-08-08T00:00:00Z', mongoVersion: '7.0', sha256: 'нет' }), /sha256/u);
});

test('закрытые перечни не разъезжаются с реализацией', () => {
  assert.ok(KNOWN_SCHEMA_VERSIONS.includes(MANIFEST_SCHEMA_VERSION), 'текущая версия обязана быть читаемой');
  assert.deepEqual([...SHA256_SUBJECTS].sort(), ['gzip-stream', 'mongodump-archive-body']);
  assert.ok(INVENTORY_SOURCES.includes('mongodump-stderr'), 'временный источник обязан быть назван, а не подразумеваться');
  assert.equal(new Set(RETENTION_REASONS).size, RETENTION_REASONS.length, 'дубль в перечне причин');
  for (const r of RETENTION_REASONS) {
    assert.ok(r.startsWith('kept:') || r.startsWith('dropped:'), `причина «${r}» не относится ни к одной стороне`);
  }
});
