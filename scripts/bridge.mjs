#!/usr/bin/env node
/**
 * yarn bridge — комната «мостик» капитана (спринт bridge-room #936; адаптер над
 * чистыми ядрами bridge-room / bridge-debts). Все fs/дата — здесь; ядро чисто.
 *
 *   yarn bridge open              — ЯВНОЕ открытие; попугай зачитывает живые долги (Б3)
 *   yarn bridge status            — где стоим
 *   yarn bridge close             — НЕявное закрытие (зовётся вечерним ритуалом, Б4)
 *   yarn bridge tools             — инструментарий ведущей: каталог кита angelina-bridge
 *   yarn bridge debt add    --id <id> --text "…" --evidence "…"
 *   yarn bridge debt settle --id <id> --evidence "…"
 *
 * Состояние — docs/bridge/state.json (один источник истины). Дом дня —
 * docs/bridge/<день>/CONSPECTUS.md. Реестр долгов — docs/bridge/DEBTS.md (append-only).
 * Каталог инструментария — docs/bridge/toolkit.catalog.json (кит kits/angelina-bridge).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import { CLOSED, awaitCaptain, closeRoom, isOpen, normalizeState, openRoom, resumeFree } from './lib/bridge-room.mjs';
import { castResolveProblems, castSchemaProblems } from './lib/bridge-cast.mjs';
import { blocksOpen as engineBlocksOpen, counts as engineCounts } from './lib/bridge-debt-engine.mjs';
import { foldNotebook, notebookCounts, readNotebook } from './lib/captain-notebook.mjs';
import { addDebt, openDebts, parseDebts, renderDebts, settleDebt, supersedeDebt } from './lib/bridge-debts.mjs';
import { validateDebt, healthMetrics, themeClusters, realActiveCount, decompose, auditDebt, propose } from './lib/bridge-debts-health.mjs';
import { findTool, inventoryToolkit, renderToolkit } from './lib/bridge-toolkit.mjs';

const ROOT = process.cwd();
const STATE_PATH = resolve(ROOT, 'docs/bridge/state.json');
const DEBTS_PATH = resolve(ROOT, 'docs/bridge/DEBTS.md');
const TOOLKIT_PATH = resolve(ROOT, 'docs/bridge/toolkit.catalog.json');

const argv = process.argv.slice(2);
const cmd = argv[0];
const sub = argv[1];
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : null;
};
const today = () => new Date().toISOString().slice(0, 10);

function loadState() {
  if (!existsSync(STATE_PATH)) return { ...CLOSED };
  try {
    // Фазовый апгрейд (#1351): легаси opened/closed нормализуется в free/idle.
    return normalizeState(JSON.parse(readFileSync(STATE_PATH, 'utf8')));
  } catch {
    return { ...CLOSED };
  }
}

const CAST_PATH = resolve(ROOT, 'docs/bridge/cast.json');

/** Стык с очередью 2 (#1352) СШИТ: движок леджера — источник истины, DEBTS.md — витрина. */
function blocksOpen() {
  try {
    return engineBlocksOpen(ROOT).length > 0;
  } catch {
    // Движок недоступен — читаем витрину; и она нечитаема → блокируем, не молчим.
    try {
      return openDebts(loadDebts()).length > 0;
    } catch {
      return true;
    }
  }
}
/** Попугай live ⇔ движок кита активен: реестр долгов читается и каталог кита поднимается. */
function parrotLive() {
  try {
    loadDebts();
    return loadToolkit().error === null;
  } catch {
    return false;
  }
}
/** Счётчики трёх контуров памяти для квитанции (M6 DoD п.5) — все три контура живые. */
function memoryCounts(day) {
  let debts;
  try {
    debts = { ...engineCounts(ROOT), note: null };
  } catch (e) {
    debts = { open: 0, repeated: 0, repaid: 0, parked: 0, blocksOpen: 0, note: `движок долгов: ${e.message}` };
  }
  let observations;
  try {
    observations = { ...notebookCounts(foldNotebook(readNotebook(ROOT, day))), note: null };
  } catch (e) {
    observations = { uttered: 0, unuttered: 0, note: `тетрадь: ${e.message}` };
  }
  let shown;
  try {
    const reg = readFileSync(resolve(ROOT, 'docs/evidence/registry.jsonl'), 'utf8');
    const attached = reg.split(/\r?\n/).filter((l) => {
      if (!l.trim()) return false;
      try {
        const j = JSON.parse(l);
        return j.shown && (j.shown.shownAt === day || j.shown.session === day);
      } catch {
        return false;
      }
    }).length;
    shown = { attached, note: null };
  } catch (e) {
    shown = { attached: 0, note: `реестр вещдоков: ${e.message}` };
  }
  return { debts, observations, shown };
}

/** Гейты открытия (M2): cast_resolvable + parrot_live_if_debts. Пусто = путь открыт. */
function openGateProblems({ absent } = {}) {
  const problems = [];
  let cast = null;
  try {
    cast = JSON.parse(readFileSync(CAST_PATH, 'utf8'));
  } catch (e) {
    return [`gate.cast_resolvable: docs/bridge/cast.json не читается (${e.message}) — состав без носителя`];
  }
  const schema = castSchemaProblems(cast);
  if (schema.length) return schema.map((p) => `gate.cast_resolvable: ${p}`);

  const resolveCarrier = (entry) => {
    if (entry.carrier === 'llm-persona') {
      return existsSync(resolve(ROOT, 'docs/virtual-team/PROMPT_ANGELINA.md')) &&
        existsSync(resolve(ROOT, 'scripts/bridge-lead-call.mjs'));
    }
    if (entry.carrier === 'pet-local') {
      return existsSync(resolve(ROOT, 'scripts/lib/storm-codex.mjs'));
    }
    if (entry.carrier === 'kit-engine') return parrotLive();
    return false;
  };
  const r = castResolveProblems(cast, { resolve: resolveCarrier, absent });
  problems.push(...r.problems.map((p) => `gate.cast_resolvable: ${p}`));

  if (blocksOpen() && !parrotLive()) {
    problems.push('gate.parrot_live_if_debts: долги в открытии, а движок попугая не поднимается — stop open (M2)');
  }
  return problems;
}
function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}
function loadDebts() {
  return existsSync(DEBTS_PATH) ? parseDebts(readFileSync(DEBTS_PATH, 'utf8')) : [];
}
/** Каталог инструментария ведущей (кит angelina-bridge). Битый/отсутствующий — честно, не молча. */
function loadToolkit() {
  if (!existsSync(TOOLKIT_PATH)) return { catalog: null, error: 'нет docs/bridge/toolkit.catalog.json' };
  try {
    return { catalog: JSON.parse(readFileSync(TOOLKIT_PATH, 'utf8')), error: null };
  } catch (e) {
    return { catalog: null, error: `docs/bridge/toolkit.catalog.json: ${e.message}` };
  }
}
function saveDebts(debts) {
  writeFileSync(DEBTS_PATH, renderDebts(debts), 'utf8');
}

/** Попугай зачитывает живые долги — немногословно (Б3). Пусто → честный empty-state. */
function parrotSquawk() {
  const live = openDebts(loadDebts());
  if (live.length === 0) {
    console.log('[попугай] Кр-р. Долгов нет.');
    return;
  }
  console.log(`[попугай] Кр-ррр! ${live.length} долг(ов) не забыто:`);
  for (const d of live) console.log(`  • ${d.debt} (${d.evidence})`);
}

if (cmd === 'presence') {
  // gate.presence_is_not_trigger (M2, норма 22.07): presence обновляет присутствие,
  // фазу НЕ меняет, действий open/mint/debts НЕ вызывает.
  const s = loadState();
  console.log(`[мостик] присутствие капитана отмечено · фаза: ${s.phase} (не изменена — presence ≠ trigger)`);
  process.exit(0);
}

if (cmd === 'await') {
  const r = awaitCaptain(loadState());
  if (!r.waited) { console.log('[мостик] await легален только из открытой комнаты (free).'); process.exit(1); }
  saveState(r.state);
  console.log('[мостик] φ=await_captain — действия ждут слова капитана (gate.await_captain: wait, не действие).');
  process.exit(0);
}

if (cmd === 'resume') {
  const r = resumeFree(loadState());
  if (!r.resumed) { console.log('[мостик] resume: комната не в ожидании.'); process.exit(1); }
  saveState(r.state);
  console.log('[мостик] слово капитана принято — φ=free.');
  process.exit(0);
}

if (cmd === 'open') {
  const day = today();
  // Гейты открытия (M2): состав резолвится, попугай жив при долгах — иначе stop open.
  const absent = new Set((arg('absent') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  const gateProblems = openGateProblems({ absent });
  if (gateProblems.length) {
    for (const p of gateProblems) console.error(`✗ ${p}`);
    console.error('[мостик] открытие остановлено гейтами (stop open). Явный absent: --absent id1,id2.');
    process.exit(1);
  }
  const r = openRoom(loadState(), { day, cap: 'cap' });
  if (r.already) {
    console.log(`[мостик] уже открыт (${r.state.day}) — второй дом не заводим.`);
  } else {
    saveState(r.state);
    const home = resolve(ROOT, `docs/bridge/${day}/CONSPECTUS.md`);
    if (!existsSync(home)) {
      mkdirSync(dirname(home), { recursive: true });
      writeFileSync(home, `# Мостик — конспект ${day}\n\n> Открыт капитаном. Закрытие — неявно, вечерним ритуалом; конспект уедет фреймом.\n\n`, 'utf8');
    }
    console.log(`[мостик] открыт капитаном (${day}). Дом: docs/bridge/${day}/CONSPECTUS.md`);
  }
  parrotSquawk();
  console.log('[мостик] инструментарий ведущей — yarn bridge tools (кит kits/angelina-bridge).');
  process.exit(0);
}

if (cmd === 'status') {
  const s = loadState();
  console.log(isOpen(s) ? `[мостик] открыт (${s.day}, кто открыл: ${s.openedBy})` : '[мостик] закрыт');
  parrotSquawk();
  process.exit(isOpen(s) ? 0 : 0);
}

if (cmd === 'tools') {
  // Инструментарий ведущей комнаты — то, что грузит скилл membrana-bridge при входе.
  // Отсутствие файла инструмента = видимое предупреждение, не тихий пропуск.
  const { catalog, error } = loadToolkit();
  if (error) {
    console.error(`[мостик] инструментарий не поднят — ${error}`);
    process.exit(2);
  }
  const exists = (rel) => existsSync(resolve(ROOT, rel));
  if (arg('doc')) {
    const found = findTool(catalog, arg('doc'));
    if (!found.ok) { console.error(`tools --doc: ${found.error}`); process.exit(2); }
    const rel = found.tool.doc || found.tool.path || found.tool.script;
    if (!rel || !exists(rel)) { console.error(`tools --doc: у «${found.tool.id}» нет читаемого документа (${rel ?? '—'})`); process.exit(1); }
    console.log(`# ${found.tool.id} · ${rel}\n`);
    console.log(readFileSync(resolve(ROOT, rel), 'utf8').split(/\r?\n/).slice(0, 40).join('\n'));
    process.exit(0);
  }
  const inv = inventoryToolkit(catalog, { exists, zone: arg('zone') });
  if (inv.problems.length) {
    for (const p of inv.problems) console.error(`✗ каталог: ${p}`);
    process.exit(2);
  }
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ kit: catalog.kit, tools: inv.tools, warnings: inv.warnings }, null, 2));
    process.exit(0);
  }
  console.log(`[мостик] инструментарий ведущей (${catalog.leadPersona}) · кит ${catalog.kit}`);
  console.log(renderToolkit(inv.tools));
  if (inv.warnings.length) {
    console.log(`\n⚠ оснастка неполна (${inv.warnings.length}):`);
    for (const w of inv.warnings) console.log(`  ${w}`);
  }
  process.exit(0);
}

if (cmd === 'close') {
  // Закрытие (Б4 + M2): вечерний ритуал или явная команда. Закрытой комнаты нет →
  // честный no-op. Печать sealed — ТОЛЬКО после записанной квитанции
  // (gate.close_carrier: квитанция не записалась → состояние не сохраняем).
  const r = closeRoom(loadState());
  if (!r.closed) {
    console.log('[мостик] не открыт — закрывать нечего (no-op).');
    process.exit(0);
  }
  const counts = memoryCounts(r.day);
  const receiptPath = resolve(ROOT, `docs/bridge/${r.day}/RECEIPT.md`);
  const fmt = (c) => (c.note ? `${JSON.stringify({ ...c, note: undefined }).slice(1, -1)} · ${c.note}` : JSON.stringify(c).slice(1, -1));
  try {
    mkdirSync(dirname(receiptPath), { recursive: true });
    writeFileSync(
      receiptPath,
      [
        `# Квитанция закрытия мостика — ${r.day}`,
        '',
        `- закрыт: ${today()} · carrier: scripts/bridge.mjs close · φ: sealed`,
        `- долги (попугай): ${fmt(counts.debts)}`,
        `- наблюдения (тетрадь): ${fmt(counts.observations)}`,
        `- показанное (ShownMemo): ${fmt(counts.shown)}`,
        '',
        '<!-- gate.close_carrier: sealed ставится только при записанной квитанции (M2) -->',
        '',
      ].join('\n'),
      'utf8',
    );
  } catch (e) {
    console.error(`✗ gate.close_carrier: квитанция не записалась (${e.message}) — печать sealed НЕ ставится.`);
    process.exit(1);
  }
  saveState(r.state);
  // Отправка конспекта — ФРЕЙМОМ, не прямым пушем (граница Ожегова).
  const home = resolve(ROOT, `docs/bridge/${r.day}/CONSPECTUS.md`);
  if (existsSync(home)) {
    const body = readFileSync(home, 'utf8');
    if (!body.includes('<!-- закрыт вечерним ритуалом')) {
      writeFileSync(home, `${body}\n<!-- закрыт вечерним ритуалом ${today()}; поставлен на отправку фреймом (не прямой пуш) -->\n`, 'utf8');
    }
  }
  console.log(`[мостик] закрыт (${r.day}) · φ=sealed · квитанция: docs/bridge/${r.day}/RECEIPT.md`);
  process.exit(0);
}

if (cmd === 'debt') {
  const debts = loadDebts();
  if (sub === 'add') {
    const next = addDebt(debts, { id: arg('id'), debt: arg('text'), evidence: arg('evidence'), date: today() });
    saveDebts(next);
    console.log(`[попугай] запомнил: ${arg('id')}. Не забуду.`);
    process.exit(0);
  }
  if (sub === 'settle') {
    if (!arg('evidence')) { console.error('settle: нужен --evidence (чем погашен долг)'); process.exit(2); }
    saveDebts(settleDebt(debts, arg('id')));
    console.log(`[попугай] погашено: ${arg('id')} (${arg('evidence')}). Запись остаётся.`);
    process.exit(0);
  }
  // Резолвер файла для offline-зубов: путь как есть от корня → scripts/ → scripts/lib/
  // (эвристика до миграции контракта M1 на типизированный ref).
  const resolveFile = (p) => {
    for (const cand of [p, `scripts/${p}`, `scripts/lib/${p}`]) {
      const abs = resolve(ROOT, cand);
      if (existsSync(abs)) return readFileSync(abs, 'utf8');
    }
    return null;
  };
  // Резолвер состояний для вида вещдока `state:` (проба-реестр). Первая проба —
  // `bridge-closed`: долг гаснет, когда мостик закрыт. Новые пробы добавлять сюда.
  const resolveState = (probe) => {
    if (probe === 'bridge-closed') return isOpen(loadState()) ? 'live' : 'resolved';
    return 'unknown';
  };
  if (sub === 'validate') {
    // ЗУБ 1 (заседание bridge-ledger-toolset, M3): живость ссылок вещдока + возраст, offline.
    const open = openDebts(debts);
    const vals = open.map((d) => validateDebt(d, { resolveFile, resolveState, today: today() }));
    const bad = vals.filter((v) => v.verdict !== 'ok');
    for (const v of vals) {
      if (v.verdict === 'stale-ref') {
        console.log(`✗ ${v.id} · СТУХЛА ССЫЛКА: ${v.deadRefs.map((d) => d.why).join('; ')}`);
      } else if (v.verdict === 'resolved-hint') {
        console.log(`✔ ${v.id} · ПОРА СНЯТЬ: ${v.resolvedHints.map((d) => d.why).join('; ')}`);
      } else if (v.verdict === 'aged') {
        console.log(`~ ${v.id} · без касания ${v.age} дн. (проверить, жив ли)`);
      }
    }
    const h = healthMetrics(debts, vals);
    console.log(
      `\n[validate] заявлено open ${h.declaredOpen} · стухших ссылок ${h.staleRef} · застарелых ${h.aged} · prose ${h.prose} · реальный намёк ~${h.realActiveHint}`,
    );
    process.exit(bad.some((v) => v.verdict === 'stale-ref') ? 1 : 0);
  }
  if (sub === 'supersede') {
    // M3: переформулировать долг с нитью (старый settled, новый open со ссылкой).
    const oldId = arg('id');
    if (!arg('to')) { console.error('supersede: нужен --to "новый текст долга"'); process.exit(2); }
    if (!arg('evidence')) { console.error('supersede: нужен --evidence (чем обоснована новая формулировка)'); process.exit(2); }
    const newId = arg('to-id') || `${oldId}-r2`;
    saveDebts(supersedeDebt(debts, oldId, { newId, debt: arg('to'), evidence: arg('evidence'), date: today(), theme: arg('theme') }));
    console.log(`[попугай] переформулировал: ${oldId} → ${newId}. Старый settled, нить сохранена.`);
    process.exit(0);
  }
  if (sub === 'invariants') {
    // ЗУБ 2 (M3): честное число живых + семантические кластеры по теме (M1). Offline.
    const open = openDebts(debts);
    const vals = open.map((d) => validateDebt(d, { resolveFile, resolveState, today: today() }));
    const count = realActiveCount(debts, vals);
    const clusters = themeClusters(debts);
    const h = healthMetrics(debts, vals);
    console.log(`[invariants] заявлено open ${count.declaredOpen} → РЕАЛЬНО ~${count.realActive} тем-узлов (кластеры схлопнуты) · стухших ${count.staleRef} · prose ${h.prose}`);
    if (clusters.length === 0) {
      console.log('  кластеров нет (каждая тема — один долг)');
    } else {
      for (const c of clusters) console.log(`  ⧉ кластер «${c.theme}» (${c.ids.length}→1 узел): ${c.ids.join(', ')}`);
    }
    process.exit(0);
  }
  if (sub === 'decompose') {
    // ЗУБ 4a (M3): раскладка по оси. Offline.
    const axis = arg('by') || 'theme';
    if (!['theme', 'age', 'status'].includes(axis)) { console.error('decompose: --by theme|age|status'); process.exit(2); }
    const d = decompose(debts, axis, today());
    console.log(`[decompose --by ${axis}]`);
    for (const g of d.groups) console.log(`  ${String(g.count).padStart(2)} · ${g.key}: ${g.ids.join(', ')}`);
    process.exit(0);
  }
  if (sub === 'audit') {
    // ЗУБ 3 (M3): сверка issue-вещдока с main через gh. Сеть; сбой gh → unknown, не падение.
    const resolveIssue = (n) => {
      try {
        const out = execFileSync('gh', ['issue', 'view', String(n), '--json', 'state', '--jq', '.state'], { encoding: 'utf8', timeout: 15_000 }).trim();
        return out === 'CLOSED' || out === 'MERGED' ? 'resolved' : out === 'OPEN' ? 'live' : 'unknown';
      } catch {
        return 'unknown';
      }
    };
    const open = openDebts(debts);
    const audits = open.map((x) => auditDebt(x, { resolveIssue }));
    for (const a of audits) {
      if (a.verdict === 'n/a') continue;
      const mark = a.verdict === 'resolved' ? '✓ РЕШЁН' : a.verdict === 'live' ? '· жив' : '? неясно';
      console.log(`${mark} · ${a.id} · issue #${a.issues.join('/#')}`);
    }
    const resolved = audits.filter((a) => a.verdict === 'resolved').length;
    console.log(`\n[audit] issue-долгов сверено ${audits.filter((a) => a.verdict !== 'n/a').length} · решённых по факту ${resolved}`);
    process.exit(0);
  }
  if (sub === 'propose') {
    // ЗУБ 4b (M3): синтез validate+audit+invariants → предложение действий.
    const resolveIssue = (n) => {
      try {
        const out = execFileSync('gh', ['issue', 'view', String(n), '--json', 'state', '--jq', '.state'], { encoding: 'utf8', timeout: 15_000 }).trim();
        return out === 'CLOSED' || out === 'MERGED' ? 'resolved' : out === 'OPEN' ? 'live' : 'unknown';
      } catch {
        return 'unknown';
      }
    };
    const open = openDebts(debts);
    const vals = open.map((x) => validateDebt(x, { resolveFile, resolveState, today: today() }));
    const audits = open.map((x) => auditDebt(x, { resolveIssue }));
    const p = propose(debts, vals, audits);
    const count = realActiveCount(debts, vals);
    console.log(`═══ ПРЕДЛОЖЕНИЕ ПОПУГАЯ (open ${count.declaredOpen} → реально ~${count.realActive}) ═══`);
    if (p.settle.length) { console.log('\n▸ SETTLE (решены по факту):'); for (const s of p.settle) console.log(`  ✔ ${s.id} — ${s.why}`); }
    if (p.supersede.length) { console.log('\n▸ SUPERSEDE (стухла ссылка, переформулировать):'); for (const s of p.supersede) console.log(`  ~ ${s.id} — ${s.why}`); }
    if (p.auditOpen.length) { console.log(`\n▸ AUDIT-ОТКРЫТО (prose, машиной не решить): ${p.auditOpen.join(', ')}`); }
    if (p.hold.length) { console.log(`\n▸ HOLD (живы): ${p.hold.join(', ')}`); }
    process.exit(0);
  }
  console.error('debt: add | settle | supersede | validate | invariants | audit | decompose | propose');
  process.exit(2);
}

console.error('bridge: open | status | close | tools | debt add|settle');
process.exit(2);
