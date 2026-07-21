/**
 * Доклад по задачам — главный продукт утра (Ф1 спринта morning-report-completion,
 * #788; тезисы T1/T4/T7 шторма storm-morning-two-precedents-2026-07-21).
 *
 * Доклад — ЗЕРКАЛО 5-блочного плана: структуру задают те же слоты frame()
 * (магистраль → подкрепление → перспективные → экспериментальные → санитарные),
 * содержимое — состояние задач блока по снимку реестра и живым ссылкам. Шаблон —
 * механика кодом, не правило строкой в скилле (T4; находка №7 прецедента #775:
 * правило без шаблона не исполняется).
 *
 * Чистое ядро: без fs/сети/LLM. Снимки (план, реестр, статусы Issue) передаёт
 * вызывающий адаптер. Тот же вход → тот же доклад.
 */

import { frame } from './day-plan-frame.mjs';
import { standup, ASSIGNMENT_STATE } from './standup-plan.mjs';

/**
 * Разбор тел слотов плана по заголовкам frame(): `## <title>` … до следующего `##`.
 * Отсутствующий слот честно возвращается с `body: null` (не пустой строкой) —
 * вызывающий отличает «слот пуст» от «слота нет» (анти-«молчун»).
 * @param {string} planMd
 * @returns {Array<{id: string, title: string, body: string|null}>}
 */
export function parsePlanSlots(planMd) {
  const lines = String(planMd ?? '').split(/\r?\n/u);
  // Границы секций ищем построчно с учётом code-fence: `## …` внутри ``` не
  // заголовок и слот не обрывает (ловля ревью Ф1 — молчаливое усечение).
  let inFence = false;
  const headings = []; // {index, title}
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/u.test(line)) inFence = !inFence;
    else if (!inFence) {
      const m = /^##\s+(.+?)\s*$/u.exec(line);
      if (m) headings.push({ index: i, title: m[1] });
    }
  });

  return frame().map((s) => {
    const at = headings.findIndex((h) => h.title === s.title);
    if (at === -1) return { id: s.id, title: s.title, body: null };
    const start = headings[at].index + 1;
    const end = at + 1 < headings.length ? headings[at + 1].index : lines.length;
    return { id: s.id, title: s.title, body: lines.slice(start, end).join('\n').trim() };
  });
}

/** Ссылки на Issue/PR (`#N`) из текста слота — мультимножество без дублей, по порядку. */
export function extractIssueRefs(body) {
  const seen = new Set();
  const out = [];
  for (const m of String(body ?? '').matchAll(/#(\d+)\b/gu)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(Number(m[1]));
    }
  }
  return out;
}

/**
 * Сопоставление слота карточкам реестра: карточка относится к слоту, если её id
 * встречается в теле слота дословно. Дешёвый детерминизм вместо угадывания.
 * @param {string|null} body
 * @param {Array<{id: string}>} registryTasks
 * @returns {string[]} ids в порядке появления в теле
 */
export function matchRegistryIds(body, registryTasks) {
  const text = String(body ?? '');
  return (registryTasks ?? [])
    .filter((t) => t?.id && text.includes(t.id))
    .map((t) => t.id)
    .sort((a, b) => text.indexOf(a) - text.indexOf(b));
}

/**
 * Назначения Тимлида для слота — через ратифицированное ядро M3-S:
 * intents из сопоставленных карточек (owner = leadPersona), снимок движка = реестр.
 * @param {string[]} ids
 * @param {Array<{id: string, leadPersona?: string|null, status?: string}>} registryTasks
 * @returns {ReturnType<typeof standup>}
 */
export function slotStandup(ids, registryTasks) {
  const byId = new Map((registryTasks ?? []).map((t) => [t.id, t]));
  const intents = ids.map((id, i) => ({
    owner: byId.get(id)?.leadPersona ?? null,
    taskRef: id,
    intent: id,
    order: i,
  }));
  const engineSnapshot = {
    tasks: Object.fromEntries(ids.map((id) => [id, { exists: byId.get(id)?.status === 'active' }])),
  };
  return standup({ intents }, engineSnapshot);
}

/** Статус Issue словами для доклада; неизвестное — честное слово, не пропуск. */
export function issueStatusWord(status) {
  if (status === 'OPEN') return 'OPEN';
  if (status === 'CLOSED') return 'CLOSED';
  if (status === 'MERGED') return 'MERGED';
  return 'не проверено';
}

/**
 * Сборка доклада-зеркала. ВСЕГДА все слоты frame() в каноническом порядке:
 * слот без тела → «— слот отсутствовал в плане —» (видимый дефект плана),
 * слот без задач → «— пусто —» (легальное состояние).
 *
 * @param {{
 *   dayKey: string,
 *   slots: Array<{id: string, title: string, body: string|null}>,
 *   registryTasks?: Array<{id: string, leadPersona?: string|null, status?: string}>,
 *   issueStatuses?: Record<number, string>,
 * }} input
 * @returns {string} markdown доклада (без провенанс-строки — её ставит адаптер)
 */
export function buildDayReport({ dayKey, slots, registryTasks = [], issueStatuses = {} }) {
  const lines = [`# Доклад по задачам — ${dayKey}`, '', 'Автор: Тимлид (vesnin) · зеркало 5-блочного плана дня.', ''];

  for (const slot of slots) {
    lines.push(`## ${slot.title}`);
    if (slot.body === null) {
      lines.push('', '⚠ слот отсутствовал в плане — дефект канона дня, не доклада.', '');
      continue;
    }
    const ids = matchRegistryIds(slot.body, registryTasks);
    const issues = extractIssueRefs(slot.body);
    const plan = slotStandup(ids, registryTasks);

    const items = [];
    for (const a of plan.assignments) {
      const stateWord =
        a.state === ASSIGNMENT_STATE.ASSIGNED
          ? `ведёт ${a.owner}`
          : a.state === ASSIGNMENT_STATE.ORPHAN
            ? '⚠ осиротело (карточка без ведущего)'
            : '⚠ пробел (нет живой карточки)';
      items.push(`- \`${a.taskRef}\` — ${stateWord}`);
    }
    for (const n of issues) {
      items.push(`- #${n} — ${issueStatusWord(issueStatuses[n])}`);
    }

    lines.push('');
    if (items.length > 0) lines.push(...items);
    else if (slot.body.trim() === '') lines.push('— пусто —');
    // Темы в каноне есть, но задач со ссылками нет — это не «пусто», а честная
    // граница доклада: он зеркалит СОСТОЯНИЕ ЗАДАЧ, прозу тем читать в каноне.
    else lines.push('— задач со ссылками нет (темы блока — в каноне дня) —');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Гейт зеркала: какие заголовки слотов frame() потеряны докладом. Пусто = зеркало
 * цело. Возврат с диагнозом, не булев отказ (T11: перезапуск с поправкой).
 * @param {string} reportMd
 * @returns {string[]}
 */
export function missingReportSlots(reportMd) {
  const text = String(reportMd ?? '');
  return frame()
    .filter((s) => !new RegExp(`^##\\s+${s.title}\\s*$`, 'mu').test(text))
    .map((s) => s.title);
}
