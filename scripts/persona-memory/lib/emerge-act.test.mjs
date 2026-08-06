/**
 * Зубы акта персоны (C3, блок `lift-persona-act`).
 *
 * Охраняемый рубеж — невозможность подлога памяти. Лифт подаёт облако, но записать во
 * всплывшее можно ровно то, что персона назвала САМА и объяснила. Всё прочее — акт,
 * написанный за неё, а это ровно то, ради запрета чего контур и строился.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { OP_VERBS } from './op-log.mjs';
import {
  ACT_INSTRUCTION,
  ACT_OUTCOMES,
  LIFT_EXCLUDED,
  PROTOCOL_PREFIX,
  actOpEvents,
  formatCloudForPersona,
  parseAct,
  shouldLift,
  validateAct,
} from './emerge-act.mjs';

const cloud = (ids = ['a', 'b']) => ({
  cloudId: 'cloud-1',
  personaId: 'vesnin',
  queryPlan: {
    axes: [
      { axis: 'topic', status: 'ran', hitCount: 2, mode: 'full' },
      { axis: 'contrast', status: 'ran', hitCount: 1, mode: 'reduced', modeReason: 'лексикон' },
    ],
    health: 'ok',
  },
  items: ids.map((id) => ({
    id,
    slot: 'similar',
    class: 'position',
    text: `текст ${id}`,
    snippetRef: { text: `текст ${id}`, fullRef: `docs/seanses/${id}.md` },
  })),
});

const act = (answer, c = cloud()) => validateAct(parseAct(answer), c);

// ── подлог невозможен ────────────────────────────────────────────────────────

test('всплыть может лишь то, что было подано: чужой id отбрасывается с причиной', () => {
  const r = act(`${PROTOCOL_PREFIX} emerge призрак — очень к месту`);
  assert.equal(r.outcome, 'silent');
  assert.deepEqual(r.emerged, []);
  assert.match(r.problems.join(' '), /нет в облаке/u);
});

test('строка без объяснения недействительна — вердикт M3 буквально', () => {
  const r = act(`${PROTOCOL_PREFIX} emerge a — `);
  assert.deepEqual(r.emerged, []);
  assert.match(r.problems.join(' '), /без объяснения/u);
});

test('негодная строка не чинится и не домысливается', () => {
  const r = act([`${PROTOCOL_PREFIX} emerge a — `, `${PROTOCOL_PREFIX} emerge b — потому что граница`].join('\n'));
  assert.deepEqual(r.emerged.map((e) => e.id), ['b'], 'годная прошла, негодная отброшена, а не исправлена');
});

test('один и тот же предмет дважды — второе объяснение отброшено, а не склеено', () => {
  const r = act([`${PROTOCOL_PREFIX} emerge a — раз`, `${PROTOCOL_PREFIX} emerge a — два`].join('\n'));
  assert.equal(r.emerged.length, 1);
  assert.equal(r.emerged[0].why, 'раз');
  assert.match(r.problems.join(' '), /дважды/u);
});

test('живая форма ответа персоны разбирается: markdown без приставки протокола', () => {
  // Вещдок 02.08, первый прогон включения: Веснин назвал ПОДЛИННЫЕ идентификаторы своего
  // архива, но оформил их markdown-ом. Строгий разбор дал silent — контур, мёртвый на
  // практике. Зуб держит именно эту форму, чтобы послабление не отменили по забывчивости.
  const r = act('**emerge** `a` — **Прямое попадание.** Про границы модулей.');
  assert.equal(r.outcome, 'emerged');
  assert.equal(r.emerged[0].id, 'a');
  assert.match(r.emerged[0].why, /Прямое попадание/u);
});

test('отказ живой формой — тоже: «cloud_rejected — остальное мимо»', () => {
  const r = act('**cloud_rejected** — Остальное про доставку, не про границы.');
  assert.equal(r.outcome, 'rejected');
  assert.match(r.rejected.reason, /про доставку/u);
});

test('послабление разбора НЕ ослабляет защиту: выдуманный id всё так же отброшен', () => {
  const r = act('**emerge** `нет-такого` — звучит убедительно');
  assert.equal(r.outcome, 'silent');
  assert.match(r.problems.join(' '), /нет в облаке/u);
});

test('разбор не зависает на длинной украшенной строке', { timeout: 2000 }, () => {
  // Первая редакция образца вплетала markdown повторяющейся группой и уходила в
  // катастрофический откат: зуб не падал, а ВИСЕЛ — отказ, который не кричит. Срок здесь
  // и есть предикат: разбор обязан кончиться.
  const nasty = `${'**'.repeat(200)}emerge ${'`'.repeat(200)}a — ${'*'.repeat(400)}почему`;
  assert.doesNotThrow(() => parseAct(nasty));
  assert.doesNotThrow(() => parseAct(`${'*'.repeat(2000)} cloud_rejected reason: «${'_'.repeat(2000)}»`));
});

test('проза со словом emerge актом не становится', () => {
  const r = act('Механизм emerge устроен так, что персона выбирает сама, и это правильно.');
  assert.equal(r.outcome, 'silent');
  assert.deepEqual(r.problems, [], 'это не негодный акт, а его отсутствие');
});

// ── три состояния, и все названы ─────────────────────────────────────────────

test('перечень исходов закрыт и заморожен', () => {
  assert.deepEqual([...ACT_OUTCOMES], ['emerged', 'rejected', 'silent']);
  assert.ok(Object.isFrozen(ACT_OUTCOMES));
});

test('ответ без акта — не отказ и не пустота, а названное третье состояние', () => {
  const r = act('Отвечаю по существу вопроса, про память ни слова.');
  assert.equal(r.outcome, 'silent', 'молчаливое «значит отказ» приписало бы персоне суждение');
  assert.equal(r.rejected, null);
  assert.deepEqual(r.emerged, []);
});

test('отказ засчитывается только с причиной', () => {
  const withReason = act(`${PROTOCOL_PREFIX} cloud_rejected reason: «ничего по теме»`);
  assert.equal(withReason.outcome, 'rejected');
  assert.equal(withReason.rejected.reason, 'ничего по теме');

  const bare = act(`${PROTOCOL_PREFIX} cloud_rejected reason: «»`);
  assert.equal(bare.outcome, 'silent');
  assert.match(bare.problems.join(' '), /отказ без причины/u);
});

test('rejected влечёт emerged пусто: противоречие не разрешается в чью-либо пользу', () => {
  const r = act(
    [`${PROTOCOL_PREFIX} emerge a — годится`, `${PROTOCOL_PREFIX} cloud_rejected reason: «ничего»`].join('\n'),
  );
  assert.equal(r.outcome, 'silent');
  assert.deepEqual(r.emerged, [], 'выбрать за персону, что она имела в виду, — и есть подлог');
  assert.match(r.problems.join(' '), /противоречив/u);
});

// ── глаголы: моменты различны ────────────────────────────────────────────────

const verbs = (a, c) => actOpEvents(a, { persona: 'vesnin', cloud: c }).map((e) => e.verb);

test('все глаголы акта — из закрытого словаря C5', () => {
  const c = cloud();
  const all = actOpEvents(act(`${PROTOCOL_PREFIX} emerge a — годится`, c), { persona: 'vesnin', cloud: c });
  for (const e of all) assert.ok(OP_VERBS.includes(e.verb), `${e.verb} вне словаря`);
});

test('cloud_query пишется всегда, surface_invoke — только когда было что показать', () => {
  const empty = cloud([]);
  assert.deepEqual(verbs(act('молчание', empty), empty), ['cloud_query']);

  const full = cloud();
  assert.deepEqual(verbs(act('молчание', full), full), ['cloud_query', 'surface_invoke']);
});

test('отказ пишется ВМЕСТЕ с surface_invoke, а не вместо: отвергают увиденное', () => {
  const c = cloud();
  const v = verbs(act(`${PROTOCOL_PREFIX} cloud_rejected reason: «мимо»`, c), c);
  assert.deepEqual(v, ['cloud_query', 'surface_invoke', 'reject']);
});

test('emerge пишется по одному на предмет и несёт объяснение персоны', () => {
  const c = cloud();
  const a = act([`${PROTOCOL_PREFIX} emerge a — раз`, `${PROTOCOL_PREFIX} emerge b — два`].join('\n'), c);
  const events = actOpEvents(a, { persona: 'vesnin', cloud: c });
  const emerges = events.filter((e) => e.verb === 'emerge');
  assert.equal(emerges.length, 2);
  assert.deepEqual(emerges.map((e) => e.ref), ['a', 'b']);
  assert.deepEqual(emerges.map((e) => e.reason), ['раз', 'два']);
  assert.ok(!events.some((e) => e.verb === 'reject'), 'всплытие и отказ несовместны');
});

test('три глагола, стоявшие без источника, источник получают', () => {
  const c = cloud();
  const a = act(`${PROTOCOL_PREFIX} emerge a — годится`, c);
  const produced = new Set(actOpEvents(a, { persona: 'vesnin', cloud: c }).map((e) => e.verb));
  for (const verb of ['cloud_query', 'surface_invoke', 'emerge']) {
    assert.ok(produced.has(verb), `${verb} обязан получить источник`);
  }
  const rejectRun = act(`${PROTOCOL_PREFIX} cloud_rejected reason: «мимо»`, c);
  assert.ok(verbs(rejectRun, c).includes('reject'));
});

// ── показ облака ─────────────────────────────────────────────────────────────

test('облако показывается с образцом строки — иначе акт неоткуда взяться', () => {
  const text = formatCloudForPersona(cloud());
  assert.ok(text.includes(ACT_INSTRUCTION));
  assert.ok(text.includes('id=a'));
  assert.ok(text.includes('docs/seanses/a.md'), 'дорога к полному тексту показана');
});

test('пустое облако показывается тоже: «архив молчит» — сведение, а не его отсутствие', () => {
  const text = formatCloudForPersona(cloud([]));
  assert.match(text, /Ничего не всплыло/u);
  assert.match(text, /cloud_rejected/u, 'отказ остаётся доступен персоне');
});

test('урезанность оси видна персоне, а не только в плане', () => {
  assert.match(formatCloudForPersona(cloud()), /урезана \(лексикон\)/u);
});

// ── кому поднимается ─────────────────────────────────────────────────────────

test('лифт поднимается тем, у кого архив есть', () => {
  assert.equal(shouldLift({ persona: 'vesnin', hasArchive: true }), true);
  assert.equal(shouldLift({ persona: 'vesnin', hasArchive: false }), false);
  assert.equal(shouldLift({ persona: 'vesnin', hasArchive: true, noLift: true }), false);
});

test('Ангелина сама не поднимается: ведущая облако советующих не судит (M3)', () => {
  assert.ok(LIFT_EXCLUDED.includes('angelina'));
  assert.equal(shouldLift({ persona: 'angelina', hasArchive: true }), false);
  assert.equal(
    shouldLift({ persona: 'angelina', hasArchive: true, enableLift: true }),
    true,
    'по явному слову — можно: запрет умолчания, а не запрет вовсе',
  );
});
