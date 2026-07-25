#!/usr/bin/env node
/**
 * yarn bridge — комната «мостик» капитана (спринт bridge-room #936; адаптер над
 * чистыми ядрами bridge-room / bridge-debts). Все fs/дата — здесь; ядро чисто.
 *
 *   yarn bridge open              — ЯВНОЕ открытие; попугай зачитывает живые долги (Б3)
 *   yarn bridge status            — где стоим
 *   yarn bridge close             — НЕявное закрытие (зовётся вечерним ритуалом, Б4)
 *   yarn bridge debt add    --id <id> --text "…" --evidence "…"
 *   yarn bridge debt settle --id <id> --evidence "…"
 *
 * Состояние — docs/bridge/state.json (один источник истины). Дом дня —
 * docs/bridge/<день>/CONSPECTUS.md. Реестр долгов — docs/bridge/DEBTS.md (append-only).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { CLOSED, closeRoom, isOpen, openRoom } from './lib/bridge-room.mjs';
import { addDebt, openDebts, parseDebts, renderDebts, settleDebt, supersedeDebt } from './lib/bridge-debts.mjs';
import { validateDebt, healthMetrics, themeClusters, realActiveCount } from './lib/bridge-debts-health.mjs';

const ROOT = process.cwd();
const STATE_PATH = resolve(ROOT, 'docs/bridge/state.json');
const DEBTS_PATH = resolve(ROOT, 'docs/bridge/DEBTS.md');

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
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { ...CLOSED };
  }
}
function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}
function loadDebts() {
  return existsSync(DEBTS_PATH) ? parseDebts(readFileSync(DEBTS_PATH, 'utf8')) : [];
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

if (cmd === 'open') {
  const day = today();
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
  process.exit(0);
}

if (cmd === 'status') {
  const s = loadState();
  console.log(isOpen(s) ? `[мостик] открыт (${s.day}, кто открыл: ${s.openedBy})` : '[мостик] закрыт');
  parrotSquawk();
  process.exit(isOpen(s) ? 0 : 0);
}

if (cmd === 'close') {
  // НЕявное закрытие (Б4): вызывается вечерним ритуалом, не капитаном. Мягко:
  // закрытой комнаты нет → честный no-op, не пустота.
  const r = closeRoom(loadState());
  if (!r.closed) {
    console.log('[мостик] не открыт — закрывать нечего (no-op).');
    process.exit(0);
  }
  saveState(r.state);
  // Отправка конспекта — ФРЕЙМОМ, не прямым пушем (граница Ожегова): помечаем
  // конспект дня к отправке; сам фрейм-контракт — потребитель #900.
  const home = resolve(ROOT, `docs/bridge/${r.day}/CONSPECTUS.md`);
  if (existsSync(home)) {
    const body = readFileSync(home, 'utf8');
    if (!body.includes('<!-- закрыт вечерним ритуалом')) {
      writeFileSync(home, `${body}\n<!-- закрыт вечерним ритуалом ${today()}; поставлен на отправку фреймом (не прямой пуш) -->\n`, 'utf8');
    }
  }
  console.log(`[мостик] закрыт вечерним ритуалом (${r.day}); конспект — на отправку фреймом.`);
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
  if (sub === 'validate') {
    // ЗУБ 1 (заседание bridge-ledger-toolset, M3): живость ссылок вещдока + возраст, offline.
    const open = openDebts(debts);
    const vals = open.map((d) => validateDebt(d, { resolveFile, today: today() }));
    const bad = vals.filter((v) => v.verdict !== 'ok');
    for (const v of vals) {
      if (v.verdict === 'stale-ref') {
        console.log(`✗ ${v.id} · СТУХЛА ССЫЛКА: ${v.deadRefs.map((d) => d.why).join('; ')}`);
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
    const vals = open.map((d) => validateDebt(d, { resolveFile, today: today() }));
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
  console.error('debt: add | settle | supersede | validate | invariants (--id + --evidence; supersede: + --to)');
  process.exit(2);
}

console.error('bridge: open | status | close | debt add|settle');
process.exit(2);
