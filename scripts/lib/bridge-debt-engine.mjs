/**
 * bridge-debt-engine — детерминированный учёт долгов попугая (M6, контур #1208, #1352).
 *
 * Kit-engine кита angelina-bridge: «попугай железно» (посылка P1 M6). Store —
 * событийный журнал docs/bridge/debt-ledger.jsonl (append-only: событие = строка,
 * состояние = свёртка). DEBTS.md остаётся ПРОИЗВОДНОЙ витриной в легаси-формате
 * (blocks_open → open, прочее → settled) — старый читатель не ломается, второго
 * параллельного реестра нет: источник истины один, журнал.
 *
 * Законы M6:
 *  - enum статусов закрыт: open | repeated | repaid | parked; синонимы запрещены;
 *  - blocks_open(d) ⇔ status ∈ {open, repeated} — ровно этот предикат видит
 *    gate.parrot_live_if_debts; parked/repaid НЕ блокируют; наблюдения и bare
 *    ShownMemo в антецедент не входят вовсе;
 *  - рождение ТОЛЬКО явное: origin ∈ {captain_gesture, lead_gesture, detector, carry,
 *    legacy-import}; наблюдение/показанное само долгом не становится;
 *  - идемпотентность: birth с тем же id/idempotencyKey при живом долге — тот же id,
 *    без дубля; repay на repaid — no-op с квитанцией; repeat только из open|repeated;
 *  - погашение с provenance ∈ {captain_word, fact_ref}; fact_ref требует factRef;
 *  - parked → open — снова явный жест (birth по тому же id), не авто.
 *
 * Чистая свёртка и глаголы (события in/out) — без ФС; ФС в фасадах *FromDisk и CLI.
 * Стык с блоком А: blocksOpen() и counts() — сигнатуры зафиксированы (#1352).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const DEBT_STATUSES = Object.freeze(['open', 'repeated', 'repaid', 'parked']);
export const REPAY_PROVENANCE = Object.freeze(['captain_word', 'fact_ref']);
export const BIRTH_ORIGINS = Object.freeze(['captain_gesture', 'lead_gesture', 'detector', 'carry', 'legacy-import']);

export const LEDGER_REL = 'docs/bridge/debt-ledger.jsonl';
export const SNAPSHOT_REL = 'docs/bridge/DEBTS.md';

/** @typedef {{id:string,status:string,debt:string,evidence:string,theme:string,birthAt:string,origin:string,repeatCount:number,lastRepeatAt:string|null,noiseScore:number,repayProvenance:string|null,factRef:string|null}} DebtRecord */

/** blocks_open ⇔ open|repeated (M6, антецедент gate.parrot_live_if_debts). */
export function blocksOpenStatus(status) {
  return status === 'open' || status === 'repeated';
}

/**
 * Свёртка журнала событий в состояние.
 * @param {object[]} events
 * @returns {Map<string, DebtRecord>}
 */
export function foldLedger(events) {
  const state = new Map();
  for (const e of events ?? []) {
    if (!e || typeof e !== 'object') continue;
    if (e.verb === 'birth') {
      const existing = state.get(e.id);
      if (existing && blocksOpenStatus(existing.status)) continue; // идемпотентность: жив — тот же id
      if (existing && existing.status === 'parked') {
        state.set(e.id, { ...existing, status: 'open' }); // parked → open: явный повторный жест
        continue;
      }
      if (existing && existing.status === 'repaid') continue; // погашенный не воскресает молча — новый id
      state.set(e.id, {
        id: e.id,
        status: 'open',
        debt: e.debt ?? '',
        evidence: e.evidence ?? '',
        theme: e.theme ?? '',
        birthAt: e.at ?? '',
        origin: e.origin ?? '',
        repeatCount: 0,
        lastRepeatAt: null,
        noiseScore: 0,
        repayProvenance: null,
        factRef: null,
      });
    } else if (e.verb === 'repeat') {
      const d = state.get(e.id);
      if (!d || !blocksOpenStatus(d.status)) continue; // repeat только из open|repeated
      state.set(e.id, { ...d, status: 'repeated', repeatCount: d.repeatCount + 1, lastRepeatAt: e.at ?? d.lastRepeatAt, noiseScore: d.noiseScore + 1 });
    } else if (e.verb === 'repay') {
      const d = state.get(e.id);
      if (!d || d.status === 'repaid') continue; // идемпотентность repay
      state.set(e.id, { ...d, status: 'repaid', repayProvenance: e.provenance ?? null, factRef: e.factRef ?? null });
    } else if (e.verb === 'park') {
      const d = state.get(e.id);
      if (!d || !blocksOpenStatus(d.status)) continue;
      state.set(e.id, { ...d, status: 'parked' });
    }
  }
  return state;
}

/**
 * Глагол как чистая функция: state × намерение → {event|null, note}.
 * event=null — no-op (идемпотентность), note объясняет словами.
 */
export function birthVerb(state, { id, debt, evidence, theme, origin, at }) {
  if (!id || !debt || !evidence) return { event: null, note: 'отказ: нужны id, debt, evidence (долг без вещдока не рождается)' };
  if (!BIRTH_ORIGINS.includes(origin)) {
    return { event: null, note: `отказ: рождение ТОЛЬКО явное — origin из (${BIRTH_ORIGINS.join('|')}); наблюдение/показанное долгом само не становится (M6)` };
  }
  const existing = state.get(id);
  if (existing && blocksOpenStatus(existing.status)) return { event: null, note: `идемпотентно: «${id}» уже жив (${existing.status})` };
  if (existing && existing.status === 'repaid') return { event: null, note: `отказ: «${id}» погашен — воскрешение только новым id (append-only история)` };
  const note = existing?.status === 'parked' ? `parked → open явным жестом: «${id}»` : `рождён «${id}» (${origin})`;
  return { event: { verb: 'birth', id, debt, evidence, theme: theme ?? '', origin, at }, note };
}

export function repeatVerb(state, { id, at }) {
  const d = state.get(id);
  if (!d) return { event: null, note: `отказ: «${id}» не найден` };
  if (!blocksOpenStatus(d.status)) return { event: null, note: `отказ: repeat только из open|repeated, а «${id}» — ${d.status}` };
  return { event: { verb: 'repeat', id, at }, note: `повтор «${id}» (×${d.repeatCount + 1}, шум ${d.noiseScore + 1})` };
}

export function repayVerb(state, { id, provenance, factRef, at }) {
  const d = state.get(id);
  if (!d) return { event: null, note: `отказ: «${id}» не найден` };
  if (d.status === 'repaid') return { event: null, note: `идемпотентно: «${id}» уже repaid (${d.repayProvenance ?? '?'})` };
  if (!REPAY_PROVENANCE.includes(provenance)) return { event: null, note: `отказ: provenance из (${REPAY_PROVENANCE.join('|')})` };
  if (provenance === 'fact_ref' && !String(factRef ?? '').trim()) return { event: null, note: 'отказ: fact_ref требует --fact <ссылка на факт>' };
  return { event: { verb: 'repay', id, provenance, factRef: factRef ?? null, at }, note: `погашен «${id}» (${provenance}${factRef ? `: ${factRef}` : ''})` };
}

export function parkVerb(state, { id, at }) {
  const d = state.get(id);
  if (!d) return { event: null, note: `отказ: «${id}» не найден` };
  if (d.status === 'parked') return { event: null, note: `идемпотентно: «${id}» уже parked` };
  if (!blocksOpenStatus(d.status)) return { event: null, note: `отказ: парковать можно только живой (open|repeated), «${id}» — ${d.status}` };
  return { event: { verb: 'park', id, at }, note: `запаркован «${id}» — из антецедента гейта снят, в истории остался` };
}

/** Журнал с диска (битая строка — находка с номером, не молчаливый пропуск). */
export function readLedger(repoRoot) {
  const p = join(repoRoot, LEDGER_REL);
  const events = [];
  const broken = [];
  if (!existsSync(p)) return { events, broken };
  readFileSync(p, 'utf8').split(/\r?\n/u).forEach((line, i) => {
    if (!line.trim()) return;
    try {
      events.push(JSON.parse(line));
    } catch {
      broken.push(i + 1);
    }
  });
  return { events, broken };
}

export function appendEvent(repoRoot, event) {
  const p = join(repoRoot, LEDGER_REL);
  mkdirSync(dirname(p), { recursive: true });
  appendFileSync(p, JSON.stringify(event) + '\n', 'utf8');
}

/**
 * СТЫК С БЛОКОМ А (#1352) — сигнатуры не менять.
 * Живые долги (blocks_open): то, что видит gate.parrot_live_if_debts.
 * @param {string} [repoRoot]
 * @returns {DebtRecord[]}
 */
export function blocksOpen(repoRoot = process.cwd()) {
  const { events } = readLedger(repoRoot);
  return [...foldLedger(events).values()].filter((d) => blocksOpenStatus(d.status));
}

/**
 * СТЫК С БЛОКОМ А (#1352) — сигнатуры не менять.
 * Счётчики для квитанции закрытия (close_receipt, M6 DoD п.5).
 * @param {string} [repoRoot]
 * @returns {{open:number,repeated:number,repaid:number,parked:number,blocksOpen:number}}
 */
export function counts(repoRoot = process.cwd()) {
  const { events } = readLedger(repoRoot);
  const c = { open: 0, repeated: 0, repaid: 0, parked: 0, blocksOpen: 0 };
  for (const d of foldLedger(events).values()) {
    c[d.status] += 1;
    if (blocksOpenStatus(d.status)) c.blocksOpen += 1;
  }
  return c;
}

/**
 * Производная витрина DEBTS.md в легаси-формате: blocks_open → open, прочее → settled.
 * Старый читатель (bridge.mjs / openDebts) продолжает видеть ровно то, что блокирует
 * открытие, — попугай не врёт тишиной. Руками не править: yarn bridge:debt <verb>.
 * @param {Map<string, DebtRecord>} state
 */
export function renderLegacySnapshot(state) {
  const head = [
    '# DEBTS — реестр техдолгов попугая (мостик, append-only)',
    '',
    '> ПРОИЗВОДНАЯ витрина журнала docs/bridge/debt-ledger.jsonl (M6, #1352): руками не',
    '> править — yarn bridge:debt birth|repeat|repay|park|list|noise. Легаси-формат:',
    '> blocks_open (open|repeated) → open; repaid|parked → settled.',
    '',
    '| id | долг | вещдок | статус | дата | тема |',
    '|----|------|--------|--------|------|------|',
  ];
  const rows = [...state.values()].map((d) => {
    const legacy = blocksOpenStatus(d.status) ? 'open' : 'settled';
    return `| ${d.id} | ${d.debt} | ${d.evidence} | ${legacy} | ${(d.birthAt ?? '').slice(0, 10)} | ${d.theme ?? ''} |`;
  });
  return [...head, ...rows, ''].join('\n');
}

/**
 * Разовая миграция: живой DEBTS.md (легаси-таблица) → события журнала.
 * open → birth(origin: legacy-import); settled → birth + repay(fact_ref: legacy DEBTS.md).
 * Вызывается фасадом, только если журнала ещё нет, — история не дублируется.
 * @param {{id:string,debt:string,evidence:string,status:string,date:string,theme:string}[]} legacyRows
 * @param {string} at
 */
export function migrationEvents(legacyRows, at) {
  const events = [];
  for (const r of legacyRows ?? []) {
    events.push({ verb: 'birth', id: r.id, debt: r.debt, evidence: r.evidence, theme: r.theme ?? '', origin: 'legacy-import', at: r.date || at });
    if (r.status === 'settled') {
      events.push({ verb: 'repay', id: r.id, provenance: 'fact_ref', factRef: 'legacy:DEBTS.md (до журнала M6)', at });
    }
  }
  return events;
}
