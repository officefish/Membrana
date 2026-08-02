/**
 * Зубы порта retrieval (C3, блок `lift-retrieval-port`).
 *
 * Охраняемый рубеж — различение «предмет покрыт не тем способом» и «нашлось мало». Порт
 * единственный, кто вправе объявить ось урезанной, и он же единственный, кто может соврать
 * этой пометкой в обе стороны: назвать урезанным пустой архив либо смолчать о подмене
 * механики. Оба случая стоят здесь порознь.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSubconsciousCloud } from './subconscious-lift.mjs';
import {
  CONFLICT_MARKERS,
  NEGATION_MARKERS,
  bm25Lite,
  corpusStats,
  createArchiveRetrieve,
  loadArchive,
  recencyBucketOf,
  retrieveByAxis,
  similarityBetween,
  toCandidate,
  tokenize,
} from './subconscious-retrieval.mjs';

const NOW = '2026-08-02';

const rec = (id, text, extra = {}) => ({
  id,
  personaId: 'vesnin',
  ts: '2026-08-01',
  provenance: `docs/seanses/${id}.md#reply-1`,
  source: 'migration-snapshot',
  kind: 'verbatim',
  class: 'position',
  text,
  ...extra,
});

const CORPUS = [
  rec('a', 'граница модуля держится контрактом порта и зоной блока'),
  rec('b', 'контракт модуля НЕ держится, зона размыта, граница отсутствует'),
  rec('c', 'здесь расхождение и спор о границе модуля, возражение записано'),
  rec('d', 'музыкальный тембр и спектр никак не про модули'),
];

// ── ось contrast: подмена механики, а не скудость выдачи ─────────────────────

test('ось contrast всегда урезана в v1 и называет, ЧЕМ подменена', () => {
  const { mode, modeReason } = retrieveByAxis(CORPUS, 'contrast', 'граница модуля', { now: NOW });
  assert.equal(mode, 'reduced');
  assert.match(modeReason, /лексикон отрицаний вместо LLM/u);
});

test('оси topic и dispute полны: их механика лексическая ПО ЗАМЫСЛУ, а не взамен', () => {
  for (const axis of ['topic', 'dispute']) {
    const { mode } = retrieveByAxis(CORPUS, axis, 'граница модуля', { now: NOW });
    assert.equal(mode, 'full', `${axis} — не подмена, а вердикт M3`);
  }
});

test('ПУСТОЙ архив режима не меняет: это факт про архив, а не про способ спрашивать', () => {
  const { hits, mode, modeReason } = retrieveByAxis([], 'topic', 'граница', { now: NOW });
  assert.deepEqual(hits, []);
  assert.equal(mode, 'full', 'совет «архив пуст ⇒ reduced» отвергнут: он стёр бы всё различение');
  assert.equal(modeReason, undefined);
});

test('нечитаемые строки архива урезают ось: неполный корпус не выдаётся за полный', () => {
  const { mode, modeReason } = retrieveByAxis(CORPUS, 'topic', 'граница модуля', {
    now: NOW,
    unreadable: 3,
  });
  assert.equal(mode, 'reduced');
  assert.match(modeReason, /нечитаемых строк архива: 3/u);
});

test('две причины урезания складываются, а не вытесняют друг друга', () => {
  const { modeReason } = retrieveByAxis(CORPUS, 'contrast', 'граница модуля', {
    now: NOW,
    unreadable: 2,
  });
  assert.match(modeReason, /лексикон/u);
  assert.match(modeReason, /нечитаемых строк архива: 2/u);
});

// ── предикаты осей: отбор, а не намерение ────────────────────────────────────

test('contrast и dispute отбирают РАЗНОЕ: отрицание — не то же, что спор', () => {
  const contrast = retrieveByAxis(CORPUS, 'contrast', 'граница модуля', { now: NOW });
  const dispute = retrieveByAxis(CORPUS, 'dispute', 'граница модуля', { now: NOW });

  assert.ok(contrast.hits.some((h) => h.id === 'b'), 'запись с отрицанием — в contrast');
  assert.ok(dispute.hits.some((h) => h.id === 'c'), 'запись со спором — в dispute');
  assert.ok(!dispute.hits.some((h) => h.id === 'b'), 'отрицание само по себе спором не является');
});

test('ось topic не фильтрует по маркерам — берёт всё, что близко', () => {
  const { hits } = retrieveByAxis(CORPUS, 'topic', 'граница модуля', { now: NOW });
  assert.ok(hits.length >= 3, 'три записи из четырёх про модули и границы');
  assert.ok(!hits.some((h) => h.id === 'd'), 'запись про тембр не делит с запросом ни слова');
});

test('лексиконы закрыты и заморожены', () => {
  assert.ok(Object.isFrozen(NEGATION_MARKERS));
  assert.ok(Object.isFrozen(CONFLICT_MARKERS));
  assert.ok(NEGATION_MARKERS.includes('не') && CONFLICT_MARKERS.includes('спор'));
});

// ── форма кандидата: то, что читает ядро ─────────────────────────────────────

test('кандидат несёт ровно те поля, по которым судит ядро', () => {
  const { hits } = retrieveByAxis(CORPUS, 'topic', 'граница модуля', { now: NOW });
  const hit = hits[0];
  for (const field of ['id', 'similarity', 'class', 'recencyBucket', 'text', 'snippetRef']) {
    assert.ok(field in hit, `ядро читает ${field}`);
  }
  assert.ok(hit.similarity > 0 && hit.similarity < 1, 'близость — доля, её ждёт simBucket');
});

test('свежесть — порядок без порогов: сегодня 0, вчера −1, старое меньше', () => {
  assert.equal(recencyBucketOf('2026-08-02', NOW), 0);
  assert.equal(recencyBucketOf('2026-08-01', NOW), -1);
  assert.ok(recencyBucketOf('2026-07-01', NOW) < recencyBucketOf('2026-08-01', NOW));
  assert.equal(recencyBucketOf('не дата', NOW), 0, 'нечитаемая дата не двигает порядок');
});

test('свежесть согласована с ядром по знаку: свежее сортируется вперёд', () => {
  const fresh = toCandidate(rec('f', 'т', { ts: '2026-08-02' }), 0.5, NOW, ['т']);
  const old = toCandidate(rec('o', 'т', { ts: '2026-01-01' }), 0.5, NOW, ['т']);
  // Ядро сравнивает `(b.recencyBucket) - (a.recencyBucket)`: положительное значит «b раньше».
  assert.ok(old.recencyBucket - fresh.recencyBucket < 0, 'свежая запись идёт первой');
});

test('указателем служит provenance, когда fullRef отсутствует по схеме', () => {
  const verbatim = toCandidate(rec('v', 'текст'), 0.5, NOW, ['текст']);
  assert.equal(verbatim.snippetRef.fullRef, 'docs/seanses/v.md#reply-1');

  const summary = toCandidate(
    rec('s', 'конспект', { kind: 'summary', fullRef: 'docs/seanses/s.md#full' }),
    0.5,
    NOW,
    ['конспект'],
  );
  assert.equal(summary.snippetRef.fullRef, 'docs/seanses/s.md#full', 'свой указатель сильнее');
});

// ── словарь близости ─────────────────────────────────────────────────────────

test('близость к запросу растёт с попаданиями и не выходит за долю', () => {
  const docs = CORPUS.map((r) => tokenize(r.text));
  const stats = corpusStats(docs);
  const hit = bm25Lite(['граница', 'модуля'], tokenize(CORPUS[0].text), stats);
  const miss = bm25Lite(['граница', 'модуля'], tokenize(CORPUS[3].text), stats);
  assert.ok(hit > miss);
  assert.equal(miss, 0, 'ни одного общего слова — ноль, а не малое число');
  assert.ok(hit < 1);
});

test('близость кандидатов друг к другу — иная величина, чем близость к запросу', () => {
  const a = { tokens: tokenize('граница модуля и зона блока') };
  const b = { tokens: tokenize('граница модуля и зона блока') };
  const c = { tokens: tokenize('тембр спектр окно') };
  assert.equal(similarityBetween(a, b), 1, 'одинаковые — единица');
  assert.equal(similarityBetween(a, c), 0, 'непересекающиеся — ноль');
  assert.equal(similarityBetween({ tokens: [] }, a), 0, 'пустое ни на что не похоже');
});

// ── шов чтения ───────────────────────────────────────────────────────────────

test('чтение отделено от отбора: битые строки считаются, а не проглатываются', () => {
  const fake = () => ['{"id":"a","text":"раз"}', 'это не json', '{"text":"без id"}', ''].join('\n');
  const { records, unreadable } = loadArchive('vesnin', { read: fake });
  assert.equal(records.length, 1);
  assert.equal(unreadable, 2, 'битый json и запись без id — обе нечитаемы');
});

test('отсутствующий архив — не поломка порта: пустой корпус без битых строк', () => {
  const { records, unreadable } = loadArchive('никто', {
    read: () => {
      throw new Error('ENOENT');
    },
  });
  assert.deepEqual(records, []);
  assert.equal(unreadable, 0);
});

test('архив читается ОДИН раз на облако, а не по разу на ось', async () => {
  let reads = 0;
  const load = () => {
    reads += 1;
    return { records: CORPUS, unreadable: 0 };
  };
  const retrieve = createArchiveRetrieve({ personaId: 'vesnin', now: NOW, load });
  await retrieve('topic', 'граница');
  await retrieve('contrast', 'граница');
  await retrieve('dispute', 'граница');
  assert.equal(reads, 1, 'три чтения дали бы три разных корпуса при дописи файла между осями');
});

test('счёт нечитаемых строк доходит от чтения до пометки, а не теряется по дороге', async () => {
  // Проверка сквозная нарочно: раздельно и чтение, и отбор уже доказаны, но провод между
  // ними — отдельный предмет. Порванный провод дал бы полный корпус из битого файла.
  const retrieve = createArchiveRetrieve({
    personaId: 'vesnin',
    now: NOW,
    load: () => loadArchive('vesnin', { read: () => '{"id":"a","text":"граница модуля"}\nбитьё\n' }),
  });
  const { mode, modeReason } = await retrieve('topic', 'граница модуля');
  assert.equal(mode, 'reduced');
  assert.match(modeReason, /нечитаемых строк архива: 1/u);
});

test('порт без хозяина и без «сегодня» не собирается', () => {
  const load = () => ({ records: [], unreadable: 0 });
  assert.throws(() => createArchiveRetrieve({ personaId: '', now: NOW, load }), /personaId/u);
  assert.throws(() => createArchiveRetrieve({ personaId: 'vesnin', now: '', load }), /now/u);
});

// ── стык с ядром ─────────────────────────────────────────────────────────────

test('облако, собранное настоящим портом, несёт режим оси в плане', async () => {
  const cloud = await buildSubconsciousCloud({
    personaId: 'vesnin',
    topic: 'граница модуля',
    retrieve: createArchiveRetrieve({
      personaId: 'vesnin',
      now: NOW,
      load: () => ({ records: CORPUS, unreadable: 0 }),
    }),
    notAlreadyOperational: () => true,
    similarityBetween,
    lambda: 0.7,
    tauOut: null,
    cloudId: 'cloud-port-1',
  });

  const axis = (name) => cloud.queryPlan.axes.find((a) => a.axis === name);
  assert.equal(axis('topic').mode, 'full');
  assert.equal(axis('contrast').mode, 'reduced');
  assert.match(axis('contrast').modeReason, /лексикон/u);
  assert.ok(cloud.items.length > 0, 'архив прочитан, кандидаты дошли до облака');
  assert.deepEqual(cloud.emerged, [], 'акт по-прежнему за персоной');
});
