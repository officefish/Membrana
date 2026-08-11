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
import { existsSync, readFileSync } from 'node:fs';
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
  ratificationFindings,
  ratifyPlan,
  TOOTH_IDS,
  UNASSIGNED_REASONS,
  VERDICTS,
} from './lib/sprint-cut/index.mjs';
import {
  TRACE_KINDS, liveActualChangedLines, liveOutcome, liveTrail,
} from './lib/sprint-cut/test-support/live-fixtures.mjs';
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

test('дайджест не зависит от порядка ключей', () => {
  const plan = load('plan.valid.json');
  // Перестановка собирается из ВСЕХ ключей плана, а не по белому списку: список молча
  // терял бы `//`-ключи, и зуб мерил бы не порядок, а их отсутствие.
  const reversed = Object.fromEntries(Object.entries(plan).reverse());
  assert.deepEqual(Object.keys(reversed).sort(), Object.keys(plan).sort(), 'перестановка обязана быть полной');
  assert.notDeepEqual(Object.keys(reversed), Object.keys(plan), 'и обязана менять порядок');
  assert.equal(cutDigestOf(reversed), cutDigestOf(plan));
});

/**
 * Долг `#plan-comment-keys-outside-digest`. Прежде этот зуб утверждал ОБРАТНОЕ — что
 * дайджест `//`-ключей не видит, — и потому охранял дефект вместо контракта.
 *
 * Вещдок 07.08: в ратифицированном `archivarius-live-wiring.json` `//dod` (семь пунктов
 * приёмки) подменялся на «условий приёмки нет, границы сняты», дайджест не менялся,
 * `planRatified` оставался `true`. По дереву: `//dod` в 13 планах, `//out-of-scope` в 10 —
 * несущее условие жило вне согласия владельца.
 */
test('правка `//`-ключа сбрасывает ратификацию: комментарий по имени, контракт по смыслу', () => {
  const plan = load('plan.valid.json');
  assert.equal(planRatified(plan), true, 'фикстура обязана входить ратифицированной');

  const withComment = { ...plan, '//': 'другой комментарий' };
  assert.notEqual(cutDigestOf(withComment), cutDigestOf(plan), '`//`-ключ обязан входить в дайджест');
  assert.equal(planRatified(withComment), false);
});

test('подмена несущего условия в `//dod` снимает согласие владельца', () => {
  const plan = load('plan.valid.json');
  const tampered = { ...plan, '//dod': 'ПОДМЕНЕНО: условий приёмки нет, границы сняты' };
  assert.equal(planRatified(tampered), false,
    'перенос согласия на изменённое условие приёмки запрещён — вердикт M2');
  assert.deepEqual(
    ratificationFindings(tampered).map((f) => f.toothId),
    ['plan_unratified'],
    'причина обязана быть названа находкой, а не молчаливым false',
  );
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

// ─── соседи ЖИВЬЁМ: форма читает живые модули через узкий мост ─────────────────
// До 11.08 здесь стояли тестовые дублёры sprint-cut/stubs/* — зелёный зуб на
// дублёре молчит о расхождении с живым исполнением (вердикт Веснина 03.08,
// карточка #1855). Перевод на живые readTraceCorpus / verdictFor семантику НЕ
// ослабляет: те же четыре инварианта проверяются, но против настоящих модулей.

test('лента вещдоков живьём: порядок по времени, пусто = «вещдоков нет», null = «факта нет»', () => {
  const trail = liveTrail([
    { traceId: 't-late', blockId: 'cut-contract', subject: 'vesnin', kind: TRACE_KINDS.CONTRACT_SIGNATURE, at: '2026-07-30T13:00:00+03:00', ref: 'docs/sprint/cut/plan.valid.json' },
    { traceId: 't-early', blockId: 'cut-contract', subject: 'vesnin', kind: TRACE_KINDS.CONTEXT_RUN, at: '2026-07-30T11:00:00+03:00', ref: 'docs/sprint/cut/plan.valid.json' },
  ]);
  assert.deepEqual(
    trail.actsForBlock('cut-contract').map((a) => a.traceId),
    ['t-early', 't-late'],
    'акты блока идут по времени, а не по порядку строк ленты',
  );
  assert.deepEqual([...trail.actsForBlock('execution-gate')], [], 'чужой блок: пусто = вещдоков нет');
  assert.deepEqual([...trail.errors], [], 'здоровая лента ошибок входа не даёт');

  const facts = { 'cut-contract': 612, 'zero-block': 0 };
  assert.equal(liveActualChangedLines(facts, 'execution-gate'), null, 'факта нет — null, не ноль');
  assert.equal(liveActualChangedLines(facts, 'zero-block'), 0, 'ноль строк — законное наблюдение, не отсутствие');
  assert.equal(liveActualChangedLines(facts, 'cut-contract'), 612);
});

test('лента живьём: битая строка называется ошибкой входа и не прячет здоровые акты', () => {
  // Частичный успех — свойство живого корпуса; дублёр его не проверял вовсе.
  const trail = liveTrail([
    { traceId: 'ok', blockId: 'cut-contract', subject: 'vesnin', kind: TRACE_KINDS.CONTEXT_RUN, at: '2026-07-30T11:00:00+03:00', ref: 'plan.json' },
    { traceId: 'broken', blockId: 'cut-contract', subject: 'vesnin', kind: TRACE_KINDS.CONTEXT_RUN, ref: 'plan.json' },
  ]);
  assert.equal(trail.actsForBlock('cut-contract').length, 1, 'здоровый акт остался виден');
  assert.equal(trail.errors.length, 1);
  assert.equal(trail.errors[0].code, 'E_TRACE_FIELDS_MISSING');
});

test('приёмник исходов живьём: сигнал бинарен, порог назван числом, времени исхода нет', () => {
  const plan = load('plan.valid.json');
  const predicted = plannedVolume(plan, 'cut-contract').changedLines;
  const res = liveOutcome({
    sprintId: plan.sprintId, blockId: 'cut-contract', personaId: 'vesnin',
    predictedChangedLines: predicted, actualChangedLines: 612,
  });
  assert.equal(res.ok, true);
  assert.equal(res.record.fit, 'overflowed');
  assert.equal(res.record.threshold, OVERSIZED_CHANGED_LINES);
  assert.ok(!('at' in res.record), 'время исхода — не поле приёмника');

  // Граница — ИНВАРИАНТ, а не иллюстрация: правка на «>=» обязана уронить зуб.
  // Порог целый (day-work-diff), поэтому равенство точное и tolerance не нужен.
  assert.ok(Number.isInteger(OVERSIZED_CHANGED_LINES), 'порог целый — точное равенство законно');
  assert.equal(
    liveOutcome({ blockId: 'cut-contract', actualChangedLines: OVERSIZED_CHANGED_LINES }).record.fit,
    'fitted',
    'РОВНО порог — влез (сравнение строгое)',
  );
  assert.equal(
    liveOutcome({ blockId: 'cut-contract', actualChangedLines: OVERSIZED_CHANGED_LINES + 1 }).record.fit,
    'overflowed',
    'порог+1 — переполнился: пара границ держит направление сравнения',
  );
  assert.equal(liveOutcome({ blockId: 'x', actualChangedLines: null }).ok, false, 'факта нет — исход не наступил');
  assert.equal(
    liveOutcome({ blockId: 'x', actualChangedLines: 10, threshold: null }).record.threshold,
    OVERSIZED_CHANGED_LINES,
    'порог по умолчанию канонический, а не undefined',
  );
});

test('дублёров соседей больше нет: ни каталога (география), ни импортов (топология)', () => {
  // Судьба пары одна (шапки снесённых дублёров): переход зубов и снос каталога
  // одним заходом. Зуб держит снос — иначе слой вернётся тихо.
  const stubsDir = new URL('./lib/sprint-cut/stubs/', import.meta.url);
  assert.equal(existsSync(stubsDir), false, 'каталог дублёров воскрес — два источника истины вернулись');

  // Отсутствие каталога — география; отсутствие ССЫЛОК на него — топология
  // (разбор Дынина 11.08). Каталог можно вернуть под другим именем, поэтому
  // зуб смотрит на импорты по всему дереву скриптов, а не только на путь.
  // git grep без находок отдаёт код 1 — это ОЖИДАЕМЫЙ успех зуба, поэтому
  // отсутствие находок читается из перехвата, а не из нулевого кода.
  let importers = '';
  try {
    // Ищем ИМПОРТЫ (`from '…/sprint-cut/stubs…'`), а не любое упоминание:
    // текст в комментариях и производный снимок SCRIPTS_LIST.md ссылками кода
    // не являются — иначе зуб красит память о снесённом слое в дефект.
    // Свой файл исключён из поиска и проверяется НИЖЕ построчно: сам этот
    // предикат содержит искомую строку и иначе ловил бы себя.
    importers = execFileSync('git', ['grep', '-l', '-E', "from ['\"][^'\"]*sprint-cut/stubs", '--', 'scripts/', ':(exclude)scripts/sprint-cut-check.test.mjs'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    importers = '';
  }
  assert.equal(importers, '', `ссылки на дублёров живы: ${importers}`);

  // Свой файл — построчно: импортом считается строка, НАЧИНАЮЩАЯСЯ с import.
  const selfImports = readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .split(/\r?\n/u)
    .filter((line) => /^import\b/u.test(line) && line.includes('sprint-cut/stubs'));
  assert.deepEqual(selfImports, [], 'зуб формы сам импортирует дублёров');
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
