/**
 * Ведомость решённого — чистое ядро (блок b1 спринта `ritual-reads-decisions`).
 *
 * ПОВОД. Вчерашний спринт `ritual-reads-done-work` научил вечер видеть сделанное, заведённое
 * билетами. Первый боевой прогон 29.09 показал остаток того же класса: читатель судит по
 * тексту, написанному ДО решения (ревью PR, карточка реестра), и не видит решения, принятого
 * ПОСЛЕ. Дынин просил тест на окно 36 ч, снятое #2506; Родченко — проверить `aria-current`,
 * снятый #2513 по ратифицированному `//decisions`; каркас дня третий день предлагал
 * `batch-collection-run-contour`, закрытый 29.09 (close-запись ленты), карточка active.
 *
 * ЧТО ЧИТАЕТСЯ. Только машинные носители решения — там, где решение оставило след формой,
 * а не прозой:
 *   - план нарезки `docs/sprint/cut/<id>.json`: ключи `//decisions` и `//recut-*` при узле
 *     `ratification.by === 'owner'` (слово владельца 30.09: перерезка = снятое согласие и новая
 *     ратификация, различать по имени ключа — искусственная синонимия);
 *   - лента прогонов `docs/procedure-runs/trail/<day>.jsonl`: close-запись прогона
 *     `membrana-local-sprint`;
 *   - реестр `docs/tasks/registry.json`: статус карточки эпика и фаз (`parentEpic`).
 * Тело PR и CLOSURE.md — проза, ведомостью НЕ читаются: решение вне спринта (#2506) ловит зуб
 * утверждений по символу в стволе, не эта ведомость.
 *
 * Ядро без ФС, сети и часов: планы, записи лент и карточки подаются значениями. Порт —
 * `decisions-ledger-port.mjs` (b2); он один на трёх читателей (вечер, каркас дня, зуб).
 */
import { SPRINT_PROCEDURE_ID } from './sprint-cut/sprint-run.mjs';

/** Окно ведомости по умолчанию — неделя, как у книги сделанного. */
export const DECISIONS_WINDOW_DAYS = 7;

/** Ключи плана, несущие решение владельца. Список закрыт: другие `//`-ключи — заметки резчика. */
export const DECISION_KEY = /^\/\/(decisions?|recut(-[A-Za-z0-9-]+)?)$/u;

/** Кому принадлежит ратификация. Любой другой автор — не решение. */
export const RATIFIED_BY = 'owner';

/** Состояние карточки закрытого спринта в реестре. */
export const CARD_STATE = Object.freeze({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  ABSENT: 'absent',
});

/** День строкой YYYY-MM-DD из ISO-момента; нечитаемое — `null`. */
export function dayOf(value) {
  const s = typeof value === 'string' ? value.trim() : '';
  const m = /^(\d{4}-\d{2}-\d{2})/u.exec(s);
  if (!m) return null;
  return Number.isNaN(Date.parse(`${m[1]}T00:00:00Z`)) ? null : m[1];
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Ратифицированные решения из планов нарезки.
 *
 * Решение = ключ `//decisions` / `//recut-*` плана, у которого узел `ratification` несёт
 * `by === 'owner'` и читаемый момент `at`. План без ратификации, с чужим `by` или без
 * момента — не решение, сколько бы текста в ключе ни было: согласие владельца — единственное,
 * что делает запись решением.
 *
 * @param {ReadonlyArray<{path?: string, plan: unknown}>} plans планы значениями (путь — для якоря)
 * @param {{sinceDay?: string|null}} [opts] день начала окна включительно; без него — все
 * @returns {Array<{sprintId: string, key: string, path: string|null, ratifiedAt: string, ratifiedDay: string, by: string, text: string}>}
 */
export function ratifiedDecisionsOf(plans, opts = {}) {
  const sinceDay = typeof opts.sinceDay === 'string' ? opts.sinceDay : null;
  const out = [];
  for (const item of plans ?? []) {
    const plan = isPlainObject(item) && 'plan' in item ? item.plan : item;
    const path = isPlainObject(item) && typeof item.path === 'string' ? item.path : null;
    if (!isPlainObject(plan)) continue;
    const r = plan.ratification;
    if (!isPlainObject(r) || r.by !== RATIFIED_BY) continue;
    const ratifiedDay = dayOf(r.at);
    if (ratifiedDay === null) continue;
    if (sinceDay !== null && ratifiedDay < sinceDay) continue;
    const sprintId = typeof plan.sprintId === 'string' && plan.sprintId.trim() ? plan.sprintId : null;
    if (sprintId === null) continue;
    for (const key of Object.keys(plan)) {
      if (!DECISION_KEY.test(key)) continue;
      const text = typeof plan[key] === 'string' ? plan[key].trim() : '';
      if (!text) continue;
      out.push({ sprintId, key, path, ratifiedAt: String(r.at), ratifiedDay, by: r.by, text });
    }
  }
  // Свежее — выше; внутри одного момента — порядок ключей плана.
  return out.sort((a, b) => compareMomentsDesc(a.ratifiedAt, b.ratifiedAt));
}

/**
 * Сравнение моментов по значению, не по строке (ревью Дынина b1; тот же класс, что #2515):
 * `…T16:22:00+03:00` лексикографически позже `…T14:22:00Z`, хотя это один и тот же миг.
 * Нечитаемый момент уходит в хвост. Парсинг строки чист — часов здесь нет.
 */
function compareMomentsDesc(a, b) {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  const na = Number.isNaN(ta);
  const nb = Number.isNaN(tb);
  if (na || nb) return na === nb ? 0 : na ? 1 : -1;
  return tb - ta;
}

/** Позже ли момент `a` момента `b` — по значению; нечитаемое никогда не «позже». */
function isLaterMoment(a, b) {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return !Number.isNaN(ta) && (Number.isNaN(tb) || ta > tb);
}

/**
 * Закрытые прогоны спринтов из записей лент.
 *
 * Закрытие = запись `procedureId === 'membrana-local-sprint'` с `runPhase === 'close'`.
 * Статус закрытия сохраняется как есть: `pass` — гейт зелёный, `fail`/`blocked` — закрыт
 * красным; и то и другое означает, что прогон окончен и новым кандидатом не является, но
 * читатель обязан видеть цвет. Повторное закрытие одного прогона — берётся последнее по `at`.
 *
 * @param {ReadonlyArray<Record<string, unknown>>} records записи лент значениями
 * @param {{sinceDay?: string|null}} [opts]
 * @returns {Array<{sprintId: string, status: string, closedAt: string, closedDay: string, subject: string|null}>}
 */
export function closedSprintRunsOf(records, opts = {}) {
  const sinceDay = typeof opts.sinceDay === 'string' ? opts.sinceDay : null;
  const byId = new Map();
  for (const r of records ?? []) {
    if (!isPlainObject(r)) continue;
    if (r.procedureId !== SPRINT_PROCEDURE_ID || r.runPhase !== 'close') continue;
    const sprintId = typeof r.runId === 'string' && r.runId.trim() ? r.runId : null;
    const closedDay = dayOf(r.at);
    if (sprintId === null || closedDay === null) continue;
    if (sinceDay !== null && closedDay < sinceDay) continue;
    const entry = {
      sprintId,
      status: typeof r.status === 'string' ? r.status : 'unknown',
      closedAt: String(r.at),
      closedDay,
      subject: typeof r.subject === 'string' ? r.subject : null,
    };
    const prev = byId.get(sprintId);
    if (!prev || isLaterMoment(entry.closedAt, prev.closedAt)) byId.set(sprintId, entry);
  }
  return [...byId.values()].sort((a, b) => compareMomentsDesc(a.closedAt, b.closedAt));
}

/**
 * Сверка закрытых прогонов с карточками реестра.
 *
 * Карточка эпика ищется по `id === sprintId`, фазы — по `parentEpic === sprintId`. Прогон
 * закрыт, а карточка или хоть одна фаза `active` — «не архивирована»: реестр подтверждает
 * состояние до решения. Архивная карточка при живых фазах — тоже долг (по фазам).
 * Карточки нет — сказано словом `absent`, а не подделано под архив.
 *
 * @param {ReadonlyArray<{sprintId: string, status: string, closedAt: string, closedDay: string}>} closed
 * @param {ReadonlyArray<{id?: string, status?: string, parentEpic?: string|null}>} tasks
 */
export function joinClosedSprintsWithCards(closed, tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  return (closed ?? []).map((c) => {
    const card = list.find((t) => isPlainObject(t) && t.id === c.sprintId) ?? null;
    const phases = list.filter((t) => isPlainObject(t) && t.parentEpic === c.sprintId);
    const phasesActive = phases.filter((t) => t.status === CARD_STATE.ACTIVE).length;
    const cardState = card === null
      ? CARD_STATE.ABSENT
      : card.status === CARD_STATE.ARCHIVED ? CARD_STATE.ARCHIVED : CARD_STATE.ACTIVE;
    const stale = cardState === CARD_STATE.ACTIVE || phasesActive > 0;
    return { ...c, card: cardState, phases: phases.length, phasesActive, stale };
  });
}

/**
 * Кандидаты магистрали минус карточки закрытых прогонов.
 *
 * Слово владельца 30.09: исключать И помечать. Только пометка оставила бы карточку в ранге и
 * вернула бы утро 30.09; только исключение спрятало бы долг закрытия. Поэтому исключённые
 * возвращаются поимённо с причиной — посылка плана печатает их, не догадываясь.
 *
 * @template {{id: string}} C
 * @param {ReadonlyArray<C>} candidates
 * @param {ReadonlyArray<{sprintId: string, status: string, closedDay: string, card?: string, phasesActive?: number}>} closed
 * @returns {{kept: C[], excluded: Array<{id: string, closedDay: string, status: string, reason: string}>}}
 */
export function staleCandidates(candidates, closed) {
  const byId = new Map((closed ?? []).map((c) => [c.sprintId, c]));
  const kept = [];
  const excluded = [];
  for (const c of candidates ?? []) {
    const hit = c && typeof c.id === 'string' ? byId.get(c.id) : undefined;
    if (!hit) {
      kept.push(c);
      continue;
    }
    const colour = hit.status === 'pass' ? 'гейт pass' : `закрыт ${hit.status}`;
    const card = hit.card === CARD_STATE.ARCHIVED
      ? `карточка архивирована, фаз active ${hit.phasesActive ?? 0}`
      : 'карточка не архивирована — долг закрытия';
    excluded.push({
      id: c.id,
      closedDay: hit.closedDay,
      status: hit.status,
      reason: `прогон спринта закрыт ${hit.closedDay} (${colour}); ${card}`,
    });
  }
  return { kept, excluded };
}

/** Обрезать текст решения для блока: полный текст — по якорю плана, не в промпте. */
export function clipDecision(text, max = 600) {
  const s = String(text ?? '').replace(/\s+/gu, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/**
 * Блок «Решённое» для читателя (вечер, каркас дня).
 *
 * Порядок: сначала закрытые прогоны с состоянием карточки (это отвечает утру), затем
 * ратифицированные решения (это отвечает вечеру). Нечитаемые входы перечислены словами — блок
 * без них молчал бы так же, как молчал вечер 29.09.
 *
 * @param {{
 *   decisions: ReadonlyArray<{sprintId: string, key: string, path: string|null, ratifiedAt: string, text: string}>,
 *   closedSprints: ReadonlyArray<{sprintId: string, status: string, closedDay: string, card: string, phases: number, phasesActive: number, stale: boolean}>,
 *   sinceDay: string,
 *   unreadable?: ReadonlyArray<string>,
 *   clip?: number,
 * }} p
 */
export function formatDecisionsBlock(p) {
  const lines = ['## Решённое (ратифицированные решения и закрытые спринты)', ''];
  lines.push(
    `Окно: с ${p.sinceDay}. Судить «не сделано» или «надо проверить» о том, что здесь названо решённым или закрытым, ` +
      'нельзя: решение принято ПОСЛЕ текста, по которому ты судишь (ревью, карточка, прежний протокол).',
    '',
  );
  const closed = p.closedSprints ?? [];
  lines.push(`### Закрытые прогоны спринтов (${closed.length})`);
  if (closed.length === 0) lines.push('- за окно закрытых прогонов нет');
  for (const c of closed) {
    const colour = c.status === 'pass' ? 'гейт pass' : `закрыт ${c.status}`;
    const card = c.card === CARD_STATE.ABSENT
      ? 'карточки в реестре нет'
      : c.card === CARD_STATE.ARCHIVED
        ? `карточка архивирована${c.phasesActive > 0 ? `, фаз active ${c.phasesActive}/${c.phases} — долг закрытия` : ''}`
        : `карточка НЕ архивирована (active${c.phases > 0 ? `, фаз active ${c.phasesActive}/${c.phases}` : ''}) — долг закрытия, не кандидат в магистраль`;
    lines.push(`- **${c.sprintId}** — прогон закрыт ${c.closedDay} (${colour}); ${card}`);
  }
  lines.push('');
  const decisions = p.decisions ?? [];
  lines.push(`### Ратифицированные решения владельца (${decisions.length})`);
  if (decisions.length === 0) lines.push('- за окно ратифицированных решений нет');
  for (const d of decisions) {
    const anchor = `${d.path ?? `docs/sprint/cut/${d.sprintId}.json`}#${d.key}`;
    lines.push(`- **${d.sprintId}** · ${d.key} · ратифицировано ${d.ratifiedAt} (${anchor}):`);
    lines.push(`  ${clipDecision(d.text, p.clip)}`);
  }
  const unreadable = p.unreadable ?? [];
  if (unreadable.length > 0) {
    lines.push('', `Не прочитано (${unreadable.length}): ${unreadable.join('; ')} — о содержимом этих носителей блок не судит.`);
  }
  return lines.join('\n');
}
