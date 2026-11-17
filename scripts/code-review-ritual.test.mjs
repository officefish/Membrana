import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendTaskContext,
  branchRanges,
  buildCodeReviewUserMessage,
  defaultOutputPath,
  estimateChangedLines,
  parseCodeReviewCli,
  taskDocsProvenance,
} from './lib/code-review-ritual.mjs';

test('parseCodeReviewCli daily defaults', () => {
  const cli = parseCodeReviewCli([]);
  assert.equal(cli.mode, 'daily');
  assert.equal(cli.full, false);
  assert.equal(cli.noRag, false);
});

test('parseCodeReviewCli pr mode', () => {
  const cli = parseCodeReviewCli(['--pr', '140', '--no-rag']);
  assert.equal(cli.mode, 'pr');
  assert.equal(cli.pr, '140');
  assert.equal(cli.noRag, true);
});

test('parseCodeReviewCli branch requires name', () => {
  assert.throws(() => parseCodeReviewCli(['--branch']), /ветку/);
});

test('parseCodeReviewCli staged mode (NB3)', () => {
  const cli = parseCodeReviewCli(['--staged']);
  assert.equal(cli.mode, 'staged');
});

test('parseCodeReviewCli uncommitted mode', () => {
  assert.equal(parseCodeReviewCli(['--uncommitted']).mode, 'uncommitted');
});

test('defaultOutputPath pr', () => {
  const p = defaultOutputPath({ mode: 'pr', pr: '140' });
  assert.match(p, /pr-140-code-review\.md$/);
});

test('buildCodeReviewUserMessage includes regulation and assignment', () => {
  const msg = buildCodeReviewUserMessage({
    mode: 'pr',
    regulation: 'REG',
    virtualTeam: 'VT',
    contextBlock: 'CTX',
    ragBlock: '',
    focusQuestion: '',
  });
  assert.match(msg, /REG/);
  assert.match(msg, /VT/);
  assert.match(msg, /CTX/);
  assert.match(msg, /LGTM или BLOCK/);
  assert.match(msg, /MAIN_DAY_ISSUE/);
});

test('estimateChangedLines parses git stat summary', () => {
  const stat = ` packages/foo/src/a.ts | 10 +++++-----\n 1 file changed, 5 insertions(+), 5 deletions(-)`;
  assert.equal(estimateChangedLines(stat), 10);
});

test('appendTaskContext includes MAIN_DAY_ISSUE when present', () => {
  const block = appendTaskContext('pr');
  assert.match(block, /MAIN_DAY_ISSUE/);
  assert.match(block, /Источник документов дня/u);
  assert.match(block, /cwd=/u);
});

test('taskDocsProvenance names cwd and exact git source for day docs', () => {
  const cwd = process.cwd();
  const block = taskDocsProvenance(['docs/MAIN_DAY_ISSUE.md', 'docs/MISSING_DAY_DOC.md'], {
    cwd,
    runGit: (args) => {
      const key = args.join(' ');
      if (key === 'rev-parse --show-toplevel') return cwd;
      if (key.includes('docs/MAIN_DAY_ISSUE.md')) return 'a'.repeat(40);
      return null;
    },
  });
  assert.match(block, /Источник документов дня/u);
  assert.match(block, /docs\/MAIN_DAY_ISSUE\.md: a{12}/u);
  assert.match(block, /docs\/MISSING_DAY_DOC\.md: absent/u);
});

// ─── TF-2 (#554): --pr обязан быть числом ─────────────────────────────────────────

test('--pr с «--» → внятный отказ, а не мусор в gh', () => {
  // Живой случай 16.07: `yarn code-review:pr -- 543` → argv [--pr, --, 543] →
  // pr="--" уходил в gh → «accepts at most 1 arg(s), received 4». Звал напрямую.
  assert.throws(() => parseCodeReviewCli(['--pr', '--', '543']), /--pr должен быть числом/u);
  assert.throws(() => parseCodeReviewCli(['--pr', 'abc']), /--pr должен быть числом/u);
});

test('--pr с числом работает; подсказка про `--` в тексте отказа', () => {
  assert.equal(parseCodeReviewCli(['--pr', '543']).pr, '543');
  try {
    parseCodeReviewCli(['--pr', '--', '543']);
    assert.fail('должен был отказать');
  } catch (e) {
    assert.match(e.message, /без `--`/u, 'отказ подсказывает корень');
  }
});

// ─── день-спринт code-review-lead-refactor: ведущий из пяти (T3/T4/T5) ───────────

test('review-lead: явное слово владельца — вершина каскада', async () => {
  const { resolveReviewLead } = await import('./lib/review-lead.mjs');
  const r = resolveReviewLead({ explicit: 'dynin', diffPaths: ['apps/client/src/x.tsx'] });
  assert.equal(r.persona, 'dynin');
  assert.match(r.basis, /явное слово/u);
});

test('review-lead: карточка с id в ветке отдаёт leadPersona', async () => {
  const { resolveReviewLead } = await import('./lib/review-lead.mjs');
  const r = resolveReviewLead({
    branch: 'feat/scoreboard-spectral-ladder-f2',
    diffPaths: ['scripts/x.mjs'],
    activeTasks: [{ id: 'scoreboard-spectral-ladder', leadPersona: 'rodchenko' }],
  });
  assert.equal(r.persona, 'rodchenko');
  assert.match(r.basis, /карточки/u);
});

test('review-lead: скоуп диффа голосует большинством; вне конвенции — Teamlead с пометкой', async () => {
  const { resolveReviewLead, DEFAULT_LEAD } = await import('./lib/review-lead.mjs');
  const scope = resolveReviewLead({
    diffPaths: ['packages/services/detectors/fft/a.ts', 'packages/services/detectors/fft/b.ts', 'apps/client/src/c.tsx'],
  });
  assert.equal(scope.persona, 'dynin', 'большинство путей — детекторы');
  const fallback = resolveReviewLead({ diffPaths: ['weird/unknown.bin'] });
  // #2491: до 28.09 здесь стояло `'vesnin'` — зуб закреплял само РАСХОЖДЕНИЕ: основание
  // говорило «Teamlead по умолчанию», а умолчание отдавало Архитектора. Теперь умолчание —
  // тимлид, и зуб сверяется с тем же `DEFAULT_LEAD`, из которого собирается основание.
  assert.equal(fallback.persona, DEFAULT_LEAD);
  assert.equal(fallback.outOfConvention, true, 'вне конвенции названо, не спрятано');
});

test('review-lead: блок ведущего несёт обязанность пропуск/блок, память и бестиарий', async () => {
  const { formatLeadBlock } = await import('./lib/review-lead.mjs');
  const md = formatLeadBlock({ persona: 'ozhegov', basis: 'тест', memoryExcerpt: 'помню X', bestiary: '| B1 | зверь |' });
  assert.match(md, /ведёт \*\*ozhegov\*\*/u);
  assert.match(md, /пропуск или блок/u);
  assert.match(md, /Память ведущего/u);
  assert.match(md, /Бестиарий/u);
});

// ─── #2491: у серверного контура и ядра есть хозяин ревью; умолчание не врёт ──────
//
// Замер 27.09, перепроверен 28.09: на шести живых наборах путей недели предикат давал ОДИН
// И ТОТ ЖЕ ответ — `vesnin` с основанием «вне конвенции … Teamlead по умолчанию». Наружу это
// выходило строкой `LGTM тимлида (vesnin)` на 57 PR из 60 за 22–27.09.

/** Живые пути влитых PR недели (#2393, #2397, #2429, #2441, #2454, #2470 и кабинет). */
const LIVE_WEEK_SCOPES = [
  ['office-only', 'ozhegov', ['packages/background-office/src/modules/panel-users/panel-users-internal.controller.ts', 'packages/background-office/src/modules/panel-users/panel-users-core.ts']],
  ['cabinet-only', 'ozhegov', ['packages/background-cabinet/src/modules/auth/auth.service.ts', 'packages/background-cabinet/src/modules/auth/register-rate-limiter.ts']],
  ['core-only', 'vesnin', ['packages/core/src/contracts/tariff/tariff-matrix.ts']],
  ['agenda-only', 'ozhegov', ['packages/agenda/src/core/registry.ts', 'packages/agenda/src/core/store.ts']],
  ['apps/cabinet-only', 'ozhegov', ['apps/cabinet/src/api/auth.ts', 'apps/cabinet/src/lib/cabinetRuntimeState.ts']],
  ['background-media', 'ozhegov', ['packages/background-media/src/modules/blob/blob.service.ts']],
  // Единственное место, где порядок правил в карте ДЕЙСТВИТЕЛЬНО решает: собственный манифест
  // серверного пакета совпадает и с общим `package.json$` Архитектора. Пакетные правила стоят
  // выше, поэтому манифест принадлежит хозяину пакета; опустить их ниже — покраснеть здесь.
  ['манифест серверного пакета', 'ozhegov', ['packages/background-office/package.json']],
  // Контейнеризация серверного контура — Математику: PROMPT_STRUCTURER.md прямо ЗАПРЕЩАЕТ
  // Структурщику «детальный деплой, hardening, Docker/CI-скрипты». Без этого правила пакетное
  // правило `background-*` отдало бы образ Структурщику — и починка #2491 внесла бы свой дефект.
  ['образ серверного пакета', 'dynin', ['packages/background-office/Dockerfile', 'docker-compose.office.yml']],
];

test('review-lead: серверный контур и ядро НЕ падают в умолчание (#2491)', async () => {
  const { resolveReviewLead } = await import('./lib/review-lead.mjs');
  for (const [name, expected, diffPaths] of LIVE_WEEK_SCOPES) {
    const r = resolveReviewLead({ diffPaths });
    assert.equal(r.outOfConvention, false, `${name}: контур недели обязан иметь хозяина по карте скоупов, а не умолчанием`);
    assert.equal(r.persona, expected, `${name}: ведущий по таблице ролей`);
    assert.match(r.basis, /скоуп диффа/u, `${name}: основание — именно скоуп, не карточка и не умолчание`);
  }
});

test('review-lead: попутный scripts/ в серверном диффе больше не голосует в одиночку (#2491)', async () => {
  const { resolveReviewLead } = await import('./lib/review-lead.mjs');
  // ПРЕДМЕТ ЗУБА ПЕРЕПИСАН после порчи, вернувшейся зелёной. Сначала он утверждал «при ничьей
  // побеждает более конкретное правило», и порча (общее правило `scripts/|docs/` поднято выше
  // серверного) его не покраснила: ничья решается наименьшим индексом ПЕРСОНЫ, а у `ozhegov`
  // он 3 и был им всегда. Настоящий механизм другой и грубее: непокрытый путь не подаёт голоса
  // вовсе. Предмет зуба — РЕАЛЬНЫЙ дифф PR #2393: пять файлов `background-office` и один
  // попутный скрипт смоука. До правки предикат отдавал `vesnin` с основанием «скоуп диффа
  // (1 из 6 путей)» и `outOfConvention: false` — то есть без пометки и без строки в stderr:
  // назначение выглядело обоснованным скоупом, хотя голосовал один посторонний файл.
  const diffPaths = [
    'packages/background-office/src/modules/panel-users/panel-users-cabinet-register.test.ts',
    'packages/background-office/src/modules/panel-users/panel-users-core.ts',
    'packages/background-office/src/modules/panel-users/panel-users-internal.controller.test.ts',
    'packages/background-office/src/modules/panel-users/panel-users-internal.controller.ts',
    'packages/background-office/src/modules/panel-users/panel-users.module.ts',
    'scripts/_ssh-panel-smoke.mjs',
  ];
  const r = resolveReviewLead({ diffPaths });
  assert.equal(r.persona, 'ozhegov', 'большинство путей серверные — ведущий их, а не автора попутного скрипта');
  assert.match(r.basis, /5 из 6 путей/u, 'серверные пути ГОЛОСУЮТ: их пять из шести, а не ноль');
});

test('review-lead: ничья голосов решается индексом ПЕРСОНЫ, а не индексом правила (#2491)', async () => {
  const { resolveReviewLead, SCOPE_TO_PERSONA } = await import('./lib/review-lead.mjs');
  // Утверждение из комментария к SCOPE_TO_PERSONA, которое иначе осталось бы непроверенным —
  // а непроверенное утверждение в комментарии это ровно предмет #2491. Найдено порчей:
  // подъём общего правила `scripts/|docs/` выше пакетных ничью НЕ переворачивает, потому что
  // `ranked` сравнивает findIndex ПО ПЕРСОНЕ, и первый индекс `ozhegov` — его старое правило
  // `packages/services/`, а не новое пакетное.
  const tie = resolveReviewLead({ diffPaths: ['packages/background-office/src/main.ts', 'scripts/x.mjs'] });
  assert.match(tie.basis, /1 из 2 путей/u, 'ровно ничья 1:1, а не большинство');
  const first = (p) => SCOPE_TO_PERSONA.findIndex((s) => s.persona === p);
  assert.ok(first('ozhegov') < first('vesnin'), 'предпосылка: первый индекс ozhegov меньше первого индекса vesnin');
  assert.equal(tie.persona, 'ozhegov', 'при ничьей побеждает персона с меньшим ПЕРВЫМ индексом в карте');
});

test('review-lead: основание умолчания называет роль ТОГО, кого умолчание возвращает (#2491)', async () => {
  const { resolveReviewLead, PERSONAS, DEFAULT_LEAD } = await import('./lib/review-lead.mjs');
  const { PERSONA_ROLE_LABELS } = await import('./lib/persona-memory.mjs');
  const d = resolveReviewLead({ diffPaths: ['weird/unknown.bin'] });
  assert.equal(d.outOfConvention, true, 'умолчание помечено громко');
  assert.ok(PERSONAS.includes(d.persona), `каскад не может вернуть персону вне PERSONAS: ${d.persona}`);
  const label = PERSONA_ROLE_LABELS[d.persona];
  assert.ok(label, `у персоны умолчания обязана быть метка роли в ЕДИНСТВЕННОМ словаре: ${d.persona}`);
  assert.ok(
    d.basis.includes(label),
    `основание «${d.basis}» обязано называть роль возвращаемой персоны (${d.persona} = ${label}), а не чужую`,
  );
  // Обратная половина того же утверждения: ни одна ЧУЖАЯ метка роли в основании не стоит.
  for (const [slug, other] of Object.entries(PERSONA_ROLE_LABELS)) {
    if (slug === d.persona || other === label) continue;
    assert.ok(!d.basis.includes(other), `основание умолчания называет чужую роль «${other}» (это и был дефект #2491)`);
  }
  assert.equal(d.persona, DEFAULT_LEAD, 'умолчание — объявленный DEFAULT_LEAD, а не совпадение');
});

test('review-lead: каждый ведущий карты скоупов — в PERSONAS и в словаре меток ролей', async () => {
  const { SCOPE_TO_PERSONA, PERSONAS, DEFAULT_LEAD } = await import('./lib/review-lead.mjs');
  const { PERSONA_ROLE_LABELS } = await import('./lib/persona-memory.mjs');
  for (const slug of [...SCOPE_TO_PERSONA.map((s) => s.persona), DEFAULT_LEAD]) {
    assert.ok(PERSONAS.includes(slug), `карта скоупов называет ведущим того, кого нет в PERSONAS: ${slug}`);
    assert.ok(PERSONA_ROLE_LABELS[slug], `у ведущего нет метки роли — основание не сможет её назвать: ${slug}`);
  }
});

test('review-lead: outOfConvention доезжает до промпта ведущего, а не оседает в stderr (#2491)', async () => {
  const { formatLeadBlock, resolveReviewLead } = await import('./lib/review-lead.mjs');
  const lead = resolveReviewLead({ diffPaths: ['weird/unknown.bin'] });
  const loud = formatLeadBlock({ ...lead, memoryExcerpt: '', bestiary: '' });
  assert.match(loud, /ВНЕ КОНВЕНЦИИ/u, 'ведущий обязан прочитать, что его назначили умолчанием');
  assert.match(loud, /SCOPE_TO_PERSONA/u, 'сказано, ЧЕГО не хватает: правила в карте скоупов');
  const quiet = formatLeadBlock({ persona: 'ozhegov', basis: 'скоуп диффа (1 из 1 путей)', outOfConvention: false });
  assert.ok(!/ВНЕ КОНВЕНЦИИ/u.test(quiet), 'на покрытом скоупе пометки быть не должно — иначе она перестанет значить что-либо');
});

test('review-lead: outOfConvention доезжает до артефакта — метка машине, строка человеку (#2491)', async () => {
  const { mkdtempSync, readFileSync: read } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { writeReviewMarkdown } = await import('./lib/code-review-ritual.mjs');
  const { leadConventionFromBody } = await import('./lib/review-gate.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'review-lead-conv-'));

  const flagged = join(dir, 'flagged.md');
  writeReviewMarkdown({
    path: flagged,
    body: 'Вердикт: LGTM\n',
    meta: { mode: 'pr', pr: '1', headSha: 'a'.repeat(40), lead: 'tarasov', leadOutOfConvention: true },
  });
  const flaggedMd = read(flagged, 'utf8');
  assert.equal(leadConventionFromBody(flaggedMd).outOfConvention, true, 'пишущая и читающая стороны делят ОДИН формат метки');
  assert.match(flaggedMd, /ВНЕ КОНВЕНЦИИ/u, 'человеку — громкая строка, не только машинная метка');

  const clean = join(dir, 'clean.md');
  writeReviewMarkdown({
    path: clean,
    body: 'Вердикт: LGTM\n',
    meta: { mode: 'pr', pr: '2', headSha: 'b'.repeat(40), lead: 'ozhegov', leadOutOfConvention: false },
  });
  assert.equal(leadConventionFromBody(read(clean, 'utf8')).outOfConvention, false, 'без признака метки нет');
});

test('провод: code-review отдаёт признак вне конвенции в мету артефакта, review-gate читает его (#2491)', async () => {
  const { readFileSync } = await import('node:fs');
  const adapter = readFileSync(new URL('./code-review.mjs', import.meta.url), 'utf8');
  assert.match(adapter, /leadOutOfConvention:\s*reviewLeadOutOfConvention/u, 'признак уходит в meta writeReviewMarkdown');
  const gate = readFileSync(new URL('./review-gate.mjs', import.meta.url), 'utf8');
  const calls = gate.match(/reviewGateDecision\(\{[^}]*\}\)/gu) ?? [];
  assert.ok(calls.length >= 2, `вызовов решения гейта ожидалось ≥2, найдено ${calls.length}`);
  for (const call of calls) {
    assert.match(call, /leadConvention:\s*leadConventionFromBody\(md\)/u, `вызов гейта теряет признак: ${call}`);
  }
});

test('провод: code-review зовёт review-lead, промпт несёт leadBlock после обрезаемого контекста', async () => {
  const { readFileSync } = await import('node:fs');
  const adapter = readFileSync(new URL('./code-review.mjs', import.meta.url), 'utf8');
  assert.match(adapter, /resolveReviewLead\(/u);
  assert.match(adapter, /readPersonaMemory\(/u, 'память ведущего подключена (T4)');
  const lib = readFileSync(new URL('./lib/code-review-ritual.mjs', import.meta.url), 'utf8');
  const trimIdx = lib.indexOf('trimText(p.contextBlock');
  const leadIdx = lib.indexOf('p.leadBlock ?');
  assert.ok(trimIdx !== -1 && leadIdx > trimIdx, 'leadBlock конкатенируется ПОСЛЕ обрезки контекста (не зверь B1)');
});

test('бестиарий: живёт, у каждого зверя графа вещдока', async () => {
  const { readFileSync } = await import('node:fs');
  const md = readFileSync(new URL('../docs/bestiary/BESTIARY.md', import.meta.url), 'utf8');
  const beasts = md.split('\n').filter((l) => /^\|\s*B\d+\s*\|/u.test(l));
  assert.ok(beasts.length >= 5, `зверей ≥5, найдено ${beasts.length}`);
  for (const b of beasts) {
    const cells = b.split('|').map((s) => s.trim()).filter(Boolean);
    assert.ok(cells[cells.length - 1].length > 5, `у зверя ${cells[1]} есть вещдок`);
  }
});

// Дефект 07.08: `log` шёл тем же трёхточечным диапазоном, что и `diff`, а у `log` три точки
// значат симметрическую разницу. Ревью получало в раздел «Commits» чужие ствольные коммиты и
// судило их как изменения ветки: пока ветка стояла на f03d309e, а ствол ушёл на 9abf5084, в
// вердикт попал предмет соседнего PR #1765. Замер: log origin/main...<отставшая> — 146
// коммитов, все ствольные, своих ноль.
test('branchRanges: diff трёхточечный (от merge-base), log двухточечный (только своё)', () => {
  const r = branchRanges('origin/main', 'feat/x');
  assert.equal(r.diffRange, 'origin/main...feat/x');
  assert.equal(r.logRange, 'origin/main..feat/x');
});

test('branchRanges: log НИКОГДА не трёхточечный — иначе чужие коммиты станут своими', () => {
  const r = branchRanges('origin/main', 'feat/x');
  assert.ok(!r.logRange.includes('...'), 'симметрическая разница в log — источник ложных находок');
  assert.ok(r.diffRange.includes('...'), 'diff обязан считать от merge-base');
});

test('branchRanges: чужая база уважается (--base)', () => {
  assert.deepEqual(branchRanges('origin/release', 'fix/y'), {
    diffRange: 'origin/release...fix/y',
    logRange: 'origin/release..fix/y',
  });
});
