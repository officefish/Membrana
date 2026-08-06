/**
 * Зубы облака подсознания (C3, #1615).
 *
 * Главный охраняемый рубеж — граница лифта и персоны. Поля `emerged` и `rejected` в облаке
 * ЕСТЬ (имена стабильны по вердикту M3), но лифт оставляет их пустыми: акт принадлежит
 * судящему звену персоны, и лифт, совершивший его, — BLOCK на приёмке, а не мелочь.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AXIS_MODES,
  AXIS_STATUS,
  CLASS_RANK,
  CLOUD_MAX,
  FLAG_ORDER,
  QUERY_AXES,
  SLOT_KINDS,
  SLOT_QUOTAS,
  buildSubconsciousCloud,
  compareCandidates,
  mmrSelect,
  normalizeRetrieval,
  ordinalFlags,
  planHealth,
  simBucket,
} from './subconscious-lift.mjs';

const LAMBDA = 0.7;
const near = (a, b) => (a.class === b.class ? 0.9 : 0.1);
const allFresh = () => true;

/** Кандидат-фикстура: числа явные, случайности нет — иначе зуб недетерминирован. */
const cand = (id, similarity, extra = {}) => ({ id, similarity, text: '', ...extra });

const build = (overrides = {}) =>
  buildSubconsciousCloud({
    personaId: 'dynin',
    topic: 'память',
    retrieve: async () => [],
    notAlreadyOperational: allFresh,
    similarityBetween: near,
    lambda: LAMBDA,
    tauOut: null,
    cloudId: 'cloud-1',
    ...overrides,
  });

// ── граница лифта и персоны ──────────────────────────────────────────────────

test('поля акта присутствуют и пусты: имена стабильны, но лифт их не наполняет', async () => {
  const cloud = await build({ retrieve: async () => [cand('a', 0.9)] });
  assert.ok('emerged' in cloud, 'имя emerged стабильно по вердикту M3');
  assert.ok('rejected' in cloud, 'имя rejected стабильно по вердикту M3');
  assert.deepEqual(cloud.emerged, []);
  assert.equal(cloud.rejected, false);
});

test('сбой оси НЕ выставляет rejected — это акт персоны, а не поломка порта', async () => {
  const cloud = await build({
    retrieve: async () => {
      throw new Error('порт лёг');
    },
  });
  assert.equal(cloud.rejected, false, 'лифт совершил бы акт за персону — BLOCK по M3');
  assert.deepEqual(cloud.emerged, []);
  assert.ok(cloud.queryPlan.axes.some((a) => a.status === 'failed'));
});

test('лифт не пишет why ни на одном предмете облака', async () => {
  const cloud = await build({ retrieve: async () => [cand('a', 0.9)] });
  for (const item of cloud.items) assert.equal(item.why, undefined);
});

// ── «архив пуст» против «мультизапрос сломан» ────────────────────────────────

test('обе ситуации дают ноль предметов и РАЗЛИЧАЮТСЯ лексемой в плане', async () => {
  const empty = await build({ retrieve: async () => [] });
  const broken = await build({
    retrieve: async () => {
      throw new Error('порт лёг');
    },
  });

  assert.equal(empty.items.length, 0);
  assert.equal(broken.items.length, 0);

  const status = (cloud, axis) => cloud.queryPlan.axes.find((a) => a.axis === axis)?.status;
  assert.equal(status(empty, 'topic'), 'ran', 'ось бежала, попаданий нет');
  assert.equal(status(broken, 'topic'), 'failed', 'ось не бежала вовсе');
  assert.notEqual(status(empty, 'topic'), status(broken, 'topic'));

  assert.equal(planHealth(empty.queryPlan), 'empty-archive');
  assert.equal(planHealth(broken.queryPlan), 'retrieval-broken');
});

test('сломанная ось несёт причину: «не смог» без причины неотличимо от «нечего»', async () => {
  const broken = await build({
    retrieve: async () => {
      throw new Error('порт лёг');
    },
  });
  const failed = broken.queryPlan.axes.find((a) => a.status === 'failed');
  assert.match(failed.reason, /порт лёг/u);
});

// ── полнота прогона: урезанная ось против пустой ─────────────────────────────

const axisOf = (cloud, axis) => cloud.queryPlan.axes.find((a) => a.axis === axis);

test('пустая ось при ПОЛНОМ прогоне не помечается урезанной', async () => {
  const cloud = await build({ retrieve: async () => ({ hits: [], mode: 'full' }) });
  const topic = axisOf(cloud, 'topic');

  assert.equal(topic.status, 'ran');
  assert.equal(topic.hitCount, 0);
  assert.equal(topic.mode, 'full', 'ноль попаданий — это про архив, а не про способ спрашивать');
  assert.equal(topic.modeReason, undefined);
  assert.equal(planHealth(cloud.queryPlan), 'empty-archive');
});

test('урезанная ось помечается ДАЖЕ с непустой выдачей — иначе пометка ловит не то', async () => {
  const cloud = await build({
    retrieve: async (axis) =>
      axis === 'contrast'
        ? { hits: [cand('a', 0.9)], mode: 'reduced', modeReason: 'лексикон отрицаний вместо LLM' }
        : [cand('b', 0.8)],
  });
  const contrast = axisOf(cloud, 'contrast');

  assert.equal(contrast.status, 'ran', 'ось бежала — статус не понижается');
  assert.ok(contrast.hitCount > 0, 'выдача непустая: пометка стоит НЕ на пустоте');
  assert.equal(contrast.mode, 'reduced');
  assert.match(contrast.modeReason, /лексикон/u);
});

test('пустая-полная и непустая-урезанная различаются по плану, а не по догадке', async () => {
  const emptyFull = await build({ retrieve: async () => ({ hits: [], mode: 'full' }) });
  const fullReduced = await build({
    retrieve: async () => ({ hits: [cand('a', 0.9)], mode: 'reduced', modeReason: 'урезан' }),
  });

  const l = axisOf(emptyFull, 'topic');
  const r = axisOf(fullReduced, 'topic');

  assert.notEqual(l.mode, r.mode, 'режим различает их напрямую');
  // Ни один из прежних признаков этого не умел: статус одинаков, а счёт попаданий даже
  // обратен ожиданию — урезанная ось нашла больше, чем полная.
  assert.equal(l.status, r.status);
  assert.ok(l.hitCount < r.hitCount);
});

test('здоровье плана и режим ортогональны: урезанность — не поломка', async () => {
  const cloud = await build({
    retrieve: async () => ({ hits: [cand('a', 0.9)], mode: 'reduced', modeReason: 'урезан' }),
  });
  assert.equal(planHealth(cloud.queryPlan), 'ok', 'исправная работа в худших условиях');
  const ran = cloud.queryPlan.axes.filter((a) => a.status === 'ran');
  assert.equal(ran.length, QUERY_AXES.length);
  assert.ok(ran.every((a) => a.mode === 'reduced'));
});

test('прежняя форма возврата порта жива: голый массив — полный прогон', async () => {
  const cloud = await build({ retrieve: async () => [cand('a', 0.9)] });
  const topic = axisOf(cloud, 'topic');
  assert.equal(topic.mode, 'full');
  assert.equal('modeReason' in topic, false, 'полному прогону объясняться не в чем');
});

test('режим существует только у бежавшей оси', async () => {
  const cloud = await build({
    retrieve: async () => {
      throw new Error('порт лёг');
    },
  });
  for (const a of cloud.queryPlan.axes) {
    if (a.status === 'ran') continue;
    assert.equal('mode' in a, false, `${a.status} не бежал — полноте покрытия неоткуда взяться`);
  }
});

test('пометка без содержания не проходит: урезанность обязана назвать причину', () => {
  const { mode, modeReason } = normalizeRetrieval({ hits: [], mode: 'reduced' });
  assert.equal(mode, 'reduced');
  assert.ok(modeReason && modeReason.trim() !== '', 'флаг без причины — та же немота, но с ярлыком');
});

test('непонятый режим считается урезанным, а не полным', () => {
  const { mode, modeReason } = normalizeRetrieval({ hits: [cand('a', 0.9)], mode: 'partial-llm' });
  assert.equal(mode, 'reduced', 'поломка порта не даёт права заявить полное покрытие');
  assert.match(modeReason, /partial-llm/u, 'причина называет само непонятое значение');
});

test('причина из одних пробелов — это отсутствие причины, а не причина', () => {
  const { modeReason } = normalizeRetrieval({ hits: [cand('a', 0.9)], mode: 'reduced', modeReason: '   ' });
  assert.match(modeReason, /не назвал причину/u);
});

test('null режимом не считается: пустое место — не значение', () => {
  const { mode, modeReason } = normalizeRetrieval({ hits: [], mode: null });
  assert.equal(mode, 'reduced');
  assert.match(modeReason, /вне закрытого списка/u);
});

test('hitCount считает выдачу ПОРТА, до вычитания эха оперативной проекции', async () => {
  // Иначе режим и счёт отвечали бы на разные вопросы в одной строке плана: режим — про то,
  // как спросили, а счёт — про то, сколько уцелело после de-dup. Читатель принял бы падение
  // счёта за скудость архива, хотя порт нашёл всё.
  const cloud = await build({
    retrieve: async () => ({
      hits: [cand('a', 0.9), cand('b', 0.8), cand('c', 0.7)],
      mode: 'reduced',
      modeReason: 'лексикон',
    }),
    notAlreadyOperational: (id) => id === 'a',
  });

  assert.equal(axisOf(cloud, 'topic').hitCount, 3, 'порт вернул три');
  assert.equal(cloud.queryPlan.deduped, 6, 'вычтенное живёт в своём поле, а не в счёте оси');
  assert.deepEqual(cloud.items.map((i) => i.id), ['a'], 'в облако дошёл один');
});

// ── квоты, слоты, отсутствие padding ─────────────────────────────────────────

test('пустой слот остаётся пустым и не добивается до квоты', async () => {
  // Два кандидата на топик при квоте similar = 5.
  const cloud = await build({
    retrieve: async (axis) => (axis === 'topic' ? [cand('a', 0.9), cand('b', 0.8)] : []),
  });
  assert.equal(cloud.items.filter((i) => i.slot === 'similar').length, 2);
  assert.equal(cloud.items.filter((i) => i.slot === 'contrast').length, 0);
  assert.equal(cloud.items.filter((i) => i.slot === 'outsider').length, 0);
});

test('квоты соблюдены и потолок облака не превышен', async () => {
  const many = Array.from({ length: 30 }, (_, i) => cand(`t${i}`, 0.9 - i * 0.01));
  const cloud = await build({ retrieve: async () => many, tauOut: 0.5 });
  assert.ok(cloud.items.length <= CLOUD_MAX, `предметов ${cloud.items.length}`);
  for (const slot of SLOT_KINDS) {
    assert.ok(cloud.items.filter((i) => i.slot === slot).length <= SLOT_QUOTAS[slot], slot);
  }
});

test('слоты не пересекаются: один предмет — один слот', async () => {
  const cloud = await build({
    retrieve: async () => Array.from({ length: 12 }, (_, i) => cand(`x${i}`, 0.9 - i * 0.05)),
    tauOut: 0.5,
  });
  const ids = cloud.items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('без калиброванного τ_out слот аутсайдеров пуст ЧЕСТНО, с причиной', async () => {
  const cloud = await build({
    retrieve: async () => Array.from({ length: 12 }, (_, i) => cand(`x${i}`, 0.1)),
    tauOut: null,
  });
  assert.equal(cloud.items.filter((i) => i.slot === 'outsider').length, 0);
  const skipped = cloud.queryPlan.axes.find((a) => a.axis === 'outsider');
  assert.equal(skipped.status, 'skipped');
  assert.match(skipped.reason, /C5/u);
});

// ── de-dup: всплытие не есть эхо оперативной проекции ────────────────────────

test('notAlreadyOperational вычитает эхо и считает вычтенное', async () => {
  const cloud = await build({
    retrieve: async (axis) => (axis === 'topic' ? [cand('a', 0.9), cand('echo', 0.95)] : []),
    notAlreadyOperational: (id) => id !== 'echo',
  });
  assert.deepEqual(cloud.items.map((i) => i.id), ['a']);
  assert.equal(cloud.queryPlan.deduped, 1, 'молчаливое вычитание неотличимо от пустого архива');
});

// ── детерминизм и границы ────────────────────────────────────────────────────

test('один вход даёт один порядок: перестановка входа исхода не меняет', async () => {
  const pool = [cand('a', 0.9, { class: 'routine' }), cand('b', 0.9, { class: 'insight' }), cand('c', 0.7)];
  const first = await build({ retrieve: async () => pool });
  const second = await build({ retrieve: async () => [...pool].reverse() });
  assert.deepEqual(first.items.map((i) => i.id), second.items.map((i) => i.id));
});

test('компаратор детерминирован на одном входе', () => {
  const a = cand('1', 0.8);
  const b = cand('2', 0.8);
  assert.equal(compareCandidates(a, b), compareCandidates(a, b));
});

test('ведро близости: граница равенства проверена, а не додумана', () => {
  assert.equal(simBucket(0.2), 1, '0.2 — начало второго ведра, а не конец первого');
  assert.equal(simBucket(0.199), 0);
  assert.equal(simBucket(0), 0);
  assert.equal(simBucket(1), 4, 'верх зажат, а не выходит за шкалу');
  assert.equal(simBucket(Number.NaN), 0, 'не число — ноль, а не бросок');
});

test('важность старше похожести: закреплённое обходит более похожее', () => {
  const pinned = cand('p', 0.1, { importanceSnapshot: 'pinned' });
  const similar = cand('s', 0.99);
  assert.ok(compareCandidates(pinned, similar) < 0, 'свежесть свергнута — вердикт C2');
});

test('ранг класса: озарение старше рутины при равной похожести', () => {
  assert.ok(compareCandidates(cand('i', 0.5, { class: 'insight' }), cand('r', 0.5, { class: 'routine' })) < 0);
  assert.equal(CLASS_RANK.insight, CLASS_RANK.precedent);
});

// ── калибровка не протаскивается умолчанием ──────────────────────────────────

test('λ без значения — отказ, а не «примерно 0.7»', () => {
  assert.throws(() => mmrSelect([cand('a', 1)], 1, { similarityBetween: near }), /λ не назначена/u);
});

test('близость без функции — отказ: её не выдумывают', () => {
  assert.throws(() => mmrSelect([cand('a', 1)], 1, { lambda: LAMBDA }), /similarityBetween/u);
});

test('cloudId и personaId обязательны: ядро не выдумывает ни адресата, ни идентификатор', async () => {
  await assert.rejects(() => build({ cloudId: '' }), /cloudId обязателен/u);
  await assert.rejects(() => build({ personaId: '' }), /personaId обязателен/u);
});

// ── перечни закрыты ──────────────────────────────────────────────────────────

test('перечни закрыты и заморожены', () => {
  assert.deepEqual([...QUERY_AXES], ['topic', 'contrast', 'dispute'], 'analogy — слот v2');
  assert.deepEqual([...SLOT_KINDS], ['similar', 'contrast', 'outsider']);
  assert.deepEqual([...AXIS_STATUS], ['ran', 'failed', 'skipped']);
  assert.deepEqual([...AXIS_MODES], ['full', 'reduced']);
  assert.ok(Object.isFrozen(AXIS_MODES));
  assert.deepEqual(SLOT_QUOTAS, { similar: 5, contrast: 3, outsider: 2 });
  assert.equal(CLOUD_MAX, 10);
  assert.deepEqual([...FLAG_ORDER], ['isPinned', 'hasOwnerQuote', 'hasConflict']);
  for (const frozen of [QUERY_AXES, SLOT_KINDS, SLOT_QUOTAS, FLAG_ORDER, CLASS_RANK]) {
    assert.ok(Object.isFrozen(frozen));
  }
});

test('флаги ординальны: строго 0 либо 1, не оценка', () => {
  const flags = ordinalFlags({ text: 'слово владельца про расхождение', importanceSnapshot: 'pinned' });
  assert.deepEqual(flags, { isPinned: 1, hasOwnerQuote: 1, hasConflict: 1 });
  for (const v of Object.values(ordinalFlags({ text: '' }))) assert.equal(v, 0);
});
