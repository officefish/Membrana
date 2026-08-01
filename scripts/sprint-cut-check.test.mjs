/**
 * Зубы нарезки-как-контракта (Block `cut-contract`, коворк `cowork-honest-sprint`).
 *
 * Тест стоит в `scripts/` СОЗНАТЕЛЬНО: корневой прогон подхватывает `scripts/*.test.mjs`,
 * а тест внутри пакета с узким `include` не побежит (грабля в `AGENTS.md`) — мёртвый
 * зуб хуже отсутствующего.
 *
 * Реестр голосов подаётся снимком-фикстурой, а не живым файлом: тест обязан быть
 * детерминированным и не краснеть от правки реестра.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { OVERSIZED_CHANGED_LINES } from './lib/day-work-diff.mjs';
import {
  assignedBlocks,
  cutDigestOf,
  cutVerdict,
  isSegmentOversized,
  MODES,
  plannedVolume,
  planRatified,
  ratifyPlan,
  TOOTH_IDS,
  UNASSIGNED_REASONS,
  VERDICTS,
} from './lib/sprint-cut/index.mjs';
import { makeEvidenceTrailStub } from './lib/sprint-cut/stubs/evidence-trail.stub.mjs';
import { makeOutcomeSinkStub } from './lib/sprint-cut/stubs/outcome-sink.stub.mjs';
import { voiceIdsFrom } from './sprint-cut-check.mjs';

const FIXTURES = new URL('../docs/sprint/cut/fixtures/', import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, FIXTURES), 'utf8'));
const VOICES = voiceIdsFrom(load('voices.fixture.json'));
const CLI = new URL('./sprint-cut-check.mjs', import.meta.url);

/** Кривая фикстура → зуб, который обязан её назвать (по одной на каждую находку). */
const CURVES = [
  ['plan.cut-shape.json', 'cut_shape', 'unreadable'],
  ['plan.block-oversized.json', 'block_oversized', 'findings'],
  ['plan.performer-unnamed.json', 'performer_unnamed', 'findings'],
  ['plan.context-unnamed.json', 'context_unnamed', 'findings'],
  ['plan.zones-overlap.json', 'zones_overlap', 'findings'],
  ['plan.plan-unratified.json', 'plan_unratified', 'findings'],
];

// ─── DoD: зелёный на валидной, красный на каждой из шести ───────────────────────

test('валидная фикстура: вердикт contract, находок нет', () => {
  const { verdict, findings } = cutVerdict(load('plan.valid.json'), { voices: VOICES });
  assert.equal(verdict, 'contract');
  assert.deepEqual([...findings], []);
});

for (const [file, toothId, verdict] of CURVES) {
  test(`кривая ${file} → ровно одна находка [${toothId}], вердикт ${verdict}`, () => {
    const res = cutVerdict(load(file), { voices: VOICES });
    assert.equal(res.verdict, verdict);
    assert.equal(res.findings.length, 1, `ожидалась одна находка, пришли: ${res.findings.map((f) => f.toothId)}`);
    assert.equal(res.findings[0].toothId, toothId);
    assert.ok(res.findings[0].where, 'находка без адреса заставляет читателя искать');
    assert.ok(res.findings[0].reason, 'находка без причины заставляет угадывать');
  });
}

test('CLI: 0 на валидной, 1 на каждой из шести кривых, зуб назван в выводе', () => {
  const path = (url) => fileURLToPath(url); // Windows: URL.pathname даёт «/C:/…» — путь только через fileURLToPath
  const run = (file) => {
    try {
      const out = execFileSync(process.execPath, [path(CLI), '--plan', path(new URL(file, FIXTURES)),
        '--voices', path(new URL('voices.fixture.json', FIXTURES))], { encoding: 'utf8' });
      return { code: 0, out };
    } catch (e) {
      return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  };

  const green = run('plan.valid.json');
  assert.equal(green.code, 0, green.out);
  assert.match(green.out, /вердикт contract/);

  for (const [file, toothId] of CURVES) {
    const red = run(file);
    assert.equal(red.code, 1, `${file}: ожидался ненулевой код возврата\n${red.out}`);
    assert.ok(red.out.includes(`[${toothId}]`), `${file}: находка не названа своим зубом\n${red.out}`);
  }
});

// ─── мерка компактности — чужая, не своя ────────────────────────────────────────

test('порог импортирован, а не переобъявлен: граница строгая, 400 влезает, 401 нет', () => {
  assert.equal(plannedVolume(load('plan.valid.json'), 'cut-contract').threshold, OVERSIZED_CHANGED_LINES);
  assert.equal(isSegmentOversized(OVERSIZED_CHANGED_LINES), false);
  assert.equal(isSegmentOversized(OVERSIZED_CHANGED_LINES + 1), true);
  const source = readFileSync(new URL('./lib/sprint-cut/cut-plan.mjs', import.meta.url), 'utf8');
  assert.ok(!/=\s*400\b/.test(source), 'число 400 переобъявлено у себя — порог начнёт расходиться с ревью молча');
});

test('нет такого блока — null, а не ноль', () => {
  assert.equal(plannedVolume(load('plan.valid.json'), 'нет-такого'), null);
});

// ─── ратификация — предикат, а не отметка ──────────────────────────────────────

test('правка тела после согласия сбрасывает ратификацию', () => {
  const plan = load('plan.valid.json');
  assert.equal(planRatified(plan), true);
  plan.blocks[0].estimate.changedLines += 1;
  assert.equal(planRatified(plan), false, 'дайджест обязан разъехаться — булев флаг перенёсся бы сам');
});

test('дайджест не зависит от порядка ключей и от `//`-комментариев', () => {
  const plan = load('plan.valid.json');
  const shuffled = { blocks: plan.blocks, cutBy: plan.cutBy, mode: plan.mode, sprintId: plan.sprintId,
    taskId: plan.taskId, schema: plan.schema, '//': 'другой комментарий' };
  assert.equal(cutDigestOf(shuffled), cutDigestOf(plan));
});

test('ратифицировать вправе только владелец, и только со временем ISO-8601 со смещением', () => {
  const plan = load('plan.valid.json');
  assert.equal(planRatified({ ...plan, ratification: { ...plan.ratification, by: 'tarasov' } }), false);
  assert.equal(planRatified({ ...plan, ratification: { ...plan.ratification, at: '2026-07-30T12:00:00' } }), false,
    'время без смещения — не момент, а намёк');
});

test('писатель отметки — инструмент по слову владельца; часов в ядре нет', () => {
  const body = load('plan.valid.json');
  delete body.ratification;
  const ok = ratifyPlan(body, { at: '2026-07-30T12:00:00+03:00' });
  assert.equal(ok.ok, true);
  assert.equal(ok.plan.ratification.by, 'owner');
  assert.equal(planRatified(ok.plan), true);

  const refused = ratifyPlan(body, {});
  assert.equal(refused.ok, false, 'now() за владельца не подставляется');
  assert.match(refused.reason, /ISO-8601/, 'отказ обязан быть с причиной, а не пустым полем');
});

// ─── отказ легален, но с причиной ──────────────────────────────────────────────

test('вторая дверь: персона пуста + причина из закрытого списка = не находка', () => {
  const plan = load('plan.valid.json');
  plan.mode = 'membrana-flow';
  plan.blocks[0] = { ...plan.blocks[0], persona: null, context: null, unassignedReason: 'mechanical' };
  const ratified = ratifyPlan(plan, { at: '2026-07-30T12:00:00+03:00' }).plan;
  assert.deepEqual([...cutVerdict(ratified, { voices: VOICES }).findings], []);
});

test('вторая дверь без причины (и с причиной вне четвёрки) — находка performer_unnamed', () => {
  const plan = load('plan.valid.json');
  plan.mode = 'membrana-flow';
  for (const reason of [undefined, 'recon', 'прототип']) {
    plan.blocks[0] = { ...plan.blocks[0], persona: null, context: null, unassignedReason: reason };
    const ratified = ratifyPlan(plan, { at: '2026-07-30T12:00:00+03:00' }).plan;
    const findings = cutVerdict(ratified, { voices: VOICES }).findings;
    assert.equal(findings.length, 1, `причина «${reason}» должна давать ровно одну находку`);
    assert.equal(findings[0].toothId, 'performer_unnamed');
  }
});

test('молчание режимом не является: план без mode читается как explicit-honest', () => {
  const plan = load('plan.valid.json');
  delete plan.mode;
  plan.blocks[0] = { ...plan.blocks[0], persona: null, context: null, unassignedReason: 'mechanical' };
  const ratified = ratifyPlan(plan, { at: '2026-07-30T12:00:00+03:00' }).plan;
  const ids = cutVerdict(ratified, { voices: VOICES }).findings.map((f) => f.toothId);
  assert.deepEqual(ids, ['performer_unnamed', 'context_unnamed'], 'причина отказа без режима отказом не делает');
});

// ─── закрытость списков и запрет молчаливого зелёного ──────────────────────────

test('списки закрыты: семь зубов, три вердикта, два режима, четыре причины', () => {
  assert.equal(TOOTH_IDS.length, 7);
  assert.deepEqual([...VERDICTS], ['contract', 'findings', 'unreadable']);
  assert.deepEqual([...MODES], ['explicit-honest', 'membrana-flow']);
  assert.deepEqual([...UNASSIGNED_REASONS], ['mechanical', 'no_profile_owner', 'owner_solo', 'urgent_recovery'],
    'разведка/прототип отвергнута владельцем сознательно');
});

test('все находки фикстур — из закрытого списка зубов', () => {
  for (const [file] of CURVES) {
    for (const f of cutVerdict(load(file), { voices: VOICES }).findings) {
      assert.ok(TOOTH_IDS.includes(f.toothId), `${file}: зуб «${f.toothId}» вне закрытого списка`);
    }
  }
});

test('реестр голосов не подан — unreadable, а не зелёный', () => {
  const res = cutVerdict(load('plan.valid.json'), { voices: [] });
  assert.equal(res.verdict, 'unreadable');
  assert.equal(res.findings[0].toothId, 'cut_shape');
});

test('нечитаемое короткое замыкание: на сломанной форме остальные пять не запускаются', () => {
  const res = cutVerdict({ schema: 'sprint-cut/1', sprintId: 's', cutBy: 'vesnin', blocks: {} }, { voices: VOICES });
  assert.equal(res.verdict, 'unreadable');
  assert.deepEqual(res.findings.map((f) => f.toothId), ['cut_shape']);
});

test('чистое ядро: ни fs, ни сети, ни часов в его исходниках', () => {
  for (const file of ['cut-plan.mjs', 'ratification.mjs', 'index.mjs']) {
    const src = readFileSync(new URL(`./lib/sprint-cut/${file}`, import.meta.url), 'utf8');
    assert.ok(!/node:fs|node:https?|fetch\(/.test(src), `${file}: ядру нельзя знать про ФС и сеть`);
    assert.ok(!/Date\.now\(|new Date\(|Math\.random\(/.test(src), `${file}: часов и случайности в ядре нет`);
  }
});

// ─── стабы соседей: своя зона, форма односторонняя ─────────────────────────────

test('стаб ленты вещдоков: пустой ответ = «вещдоков нет», null = «факта нет»', () => {
  const trail = makeEvidenceTrailStub({
    acts: [
      { blockId: 'cut-contract', personaId: 'vesnin', kind: 'contract_signed', at: '2026-07-30T13:00:00+03:00' },
      { blockId: 'cut-contract', personaId: 'vesnin', kind: 'profile_run', at: '2026-07-30T11:00:00+03:00' },
    ],
    actual: { 'cut-contract': 612 },
  });
  assert.deepEqual(trail.actsForBlock('cut-contract').map((a) => a.kind), ['profile_run', 'contract_signed']);
  assert.deepEqual([...trail.actsForBlock('execution-gate')], []);
  assert.equal(trail.actualChangedLines('execution-gate'), null);
  assert.equal(trail.actualChangedLines('cut-contract'), 612);
});

test('стаб приёмника исходов: сигнал бинарен, порог назван числом, времени исхода нет', () => {
  const plan = load('plan.valid.json');
  const sink = makeOutcomeSinkStub();
  const predicted = plannedVolume(plan, 'cut-contract').changedLines;
  const res = sink.accept({ sprintId: plan.sprintId, blockId: 'cut-contract', personaId: 'vesnin',
    predictedChangedLines: predicted, actualChangedLines: 612 });
  assert.equal(res.ok, true);
  assert.equal(res.record.fit, 'overflowed');
  assert.equal(res.record.threshold, OVERSIZED_CHANGED_LINES);
  assert.ok(!('at' in res.record), 'время исхода — не моё поле');
  assert.equal(sink.accept({ blockId: 'x', actualChangedLines: null }).ok, false);
  assert.equal(sink.records.length, 1);
});

// ─── проекция «назначен» ───────────────────────────────────────────────────────

test('assignedBlocks отдаёт план, а не факт: назначен ≠ участвовал', () => {
  const rows = assignedBlocks(load('plan.valid.json'));
  assert.deepEqual(rows.map((r) => r.blockId), ['cut-contract', 'execution-gate', 'experience-loop']);
  assert.deepEqual(rows.map((r) => r.persona), ['vesnin', 'dynin', 'rodchenko']);
  assert.deepEqual(rows.map((r) => r.context), ['vesnin', 'dynin', 'kuryokhin'],
    'персона и контекст — два поля; у третьего блока они РАЗНЫЕ намеренно');
  assert.ok(rows.every((r) => !('participated' in r)), 'участия в проекции плана нет по построению');
});

// ── Машинный revisionAt (01.08, карточка cut-act-trace, блок machine-revision-at) ────
// Замок был, но ключ у того, кого он запирает: isStale считает свежесть от revisionAt,
// а писал revisionAt резчик рукой. Вещдок 01.08 (meeting-gates-teeth): председатель
// перерезал план v1→v2 и метку не двинул — ничто не заставило.

const { blockRevisionDigest, stampRevisions } = await import('./lib/sprint-cut/ratification.mjs');
const AT1 = '2026-08-01T10:00:00+03:00';
const AT2 = '2026-08-01T12:00:00+03:00';
const blk = (over = {}) => ({ blockId: 'b1', persona: 'vesnin', context: 'vesnin', zone: ['a.mjs'], estimate: { changedLines: 10 }, ...over });

test('ратификация ставит revisionAt инструментом — резчик его больше не пишет', () => {
  const res = ratifyPlan({ sprintId: 'x', blocks: [blk()] }, { at: AT1 });
  assert.equal(res.ok, true);
  assert.equal(res.plan.blocks[0].revisionAt, AT1);
  assert.equal(typeof res.plan.blocks[0].revisionOf, 'string');
});

test('перерезка двигает метку ТОЛЬКО у изменённого блока — чужие вещдоки не гасим', () => {
  const first = ratifyPlan({ sprintId: 'x', blocks: [blk({ blockId: 'a' }), blk({ blockId: 'b' })] }, { at: AT1 }).plan;
  // меняется тело только блока «a»
  const edited = { ...first, blocks: [{ ...first.blocks[0], zone: ['a.mjs', 'c.mjs'] }, first.blocks[1]] };
  const second = ratifyPlan(edited, { at: AT2 }).plan;
  assert.equal(second.blocks[0].revisionAt, AT2, 'изменённый блок обязан получить новую метку');
  assert.equal(second.blocks[1].revisionAt, AT1, 'нетронутый блок метку не меняет — иначе ложное красное');
});

test('повторная ратификация без правок метку не двигает', () => {
  const first = ratifyPlan({ sprintId: 'x', blocks: [blk()] }, { at: AT1 }).plan;
  const second = ratifyPlan(first, { at: AT2 }).plan;
  assert.equal(second.blocks[0].revisionAt, AT1);
});

test('дайджест тела блока не зависит от самой метки — иначе она ссылалась бы на себя', () => {
  const a = blockRevisionDigest(blk());
  const b = blockRevisionDigest(blk({ revisionAt: AT1, revisionOf: 'что угодно' }));
  assert.equal(a, b);
});

test('следствие #1566: после перерезки разбор родителя протухает САМ — метка ушла вперёд', () => {
  const parent = ratifyPlan({ sprintId: 'x', blocks: [blk({ blockId: 'core' })] }, { at: AT1 }).plan;
  const traceAt = '2026-08-01T10:30:00+03:00'; // разбор родителя сделан после первой ратификации
  assert.equal(traceAt < parent.blocks[0].revisionAt, false, 'до перерезки след свежий');
  const recut = ratifyPlan(
    { ...parent, blocks: [{ ...parent.blocks[0], blockId: 'core', zone: ['a.mjs', 'split.mjs'] }] },
    { at: AT2 },
  ).plan;
  assert.equal(traceAt < recut.blocks[0].revisionAt, true, 'после перерезки тот же след обязан стать протухшим');
});

test('stampRevisions не трогает не-массив и не-объекты: мусор не превращается в блоки', () => {
  assert.equal(stampRevisions(undefined, AT1), undefined);
  assert.deepEqual(stampRevisions([null, 42], AT1), [null, 42]);
});

test('первая простановка уважает рукописную метку — внедрение не гасит историю дерева', () => {
  const legacy = { sprintId: 'x', blocks: [blk({ revisionAt: '2026-08-01T10:00:00Z' })] };
  const res = ratifyPlan(legacy, { at: AT2 }).plan;
  assert.equal(res.blocks[0].revisionAt, '2026-08-01T10:00:00Z', 'метка существующего плана не двигается');
  assert.equal(typeof res.blocks[0].revisionOf, 'string', 'но дайджест записывается — дальше метка машинная');
});

test('после первой простановки правка тела метку уже двигает', () => {
  const legacy = { sprintId: 'x', blocks: [blk({ revisionAt: '2026-08-01T10:00:00Z' })] };
  const migrated = ratifyPlan(legacy, { at: AT1 }).plan;
  const edited = { ...migrated, blocks: [{ ...migrated.blocks[0], zone: ['a.mjs', 'z.mjs'] }] };
  assert.equal(ratifyPlan(edited, { at: AT2 }).plan.blocks[0].revisionAt, AT2);
});

test('блока без метки вовсе первая простановка касается: метка обязана появиться', () => {
  const res = ratifyPlan({ sprintId: 'x', blocks: [blk()] }, { at: AT1 }).plan;
  assert.equal(res.blocks[0].revisionAt, AT1);
});
