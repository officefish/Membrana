/**
 * Предикат единственного входа в утро (вердикт M4-H заседания `angelina-hostess`, 21.07:
 * «вычистка: |entry| = 1, атомарно, со следом»).
 *
 * ЗАЧЕМ ПРЕДИКАТ, КОГДА СТРОКА УЖЕ ЕСТЬ. Встреча печатала «утро ведёт единственный вход
 * (|entry|=1)» как УТВЕРЖДЕНИЕ: за ним не стояло ни одной проверки. Появись завтра вторая
 * дверь в утро — строка продолжила бы утверждать единственность, и владелец узнал бы о
 * расхождении не от прибора, а от беды. Это тот же класс, что и сторож, не краснеющий на
 * внесённой порче: механизм, который не может сказать «нет», ничего не удостоверяет.
 *
 * ЗАЧЕМ ВООБЩЕ ОДИН ВХОД. Прецедент холодной сессии 21.07
 * (`docs/precedents/2026-07-21-ritual-old-scenario-lost-sprint.md`): вторая живая дверь в
 * утро увела сессию по старому сценарию, и день был потерян. Вердикт M1 закрыл дверь в
 * скиллах («утро вычеркнуто из developer-rhythm, ссылка, не копия»), M4 — в коде.
 *
 * ЧТО СЧИТАЕТСЯ ВХОДОМ — И ЧЕМ ВХОД ОТЛИЧАЕТСЯ ОТ УКАЗАТЕЛЯ. Вход — это КОМАНДА,
 * открывающая процедуру утра. Скилл, велящий запустить ту же команду, второй дверью не
 * является: он указатель на единственную дверь, и ровно этого требовал вердикт M1 («ссылка,
 * не копия»). Поэтому считаются РАЗЛИЧНЫЕ команды, а не упоминания: свидетели одной команды
 * схлопываются в одну дверь, сколько бы их ни было.
 *
 * АВТОЗАПУСК — ИСКЛЮЧЕНИЕ: он всегда своя дверь, даже когда зовёт ту же команду. Скилл
 * указывает путь ЧЕЛОВЕКУ, а хук или прогон CI входит в утро САМ; вердикт M4 отверг демона
 * прямо, «доступность = свойство активной сессии». Дверь, открывающаяся без человека, — это
 * второй способ войти, а не свидетель первого.
 *
 * Обе границы найдены порчей живого дерева, а не рассуждением. Первая редакция считала
 * упоминания и объявила две двери там, где дверь одна (команда и указывающий на неё скилл).
 * Вторая схлопывала автозапуск в свидетеля: вписанный в дерево хук с той же командой оставлял
 * встречу зелёной — молчание ровно о том, что вердикт запретил. Обе поймал внесённый дефект.
 *
 * ЯДРО НЕ ЧИТАЕТ ФС: наблюдение приходит значением, порт собирает его снаружи. Иначе
 * предикат нельзя зубить на фикстурах, а зуб на живом дереве меряет дерево, не правило.
 */

/** Слои, в которых может объявиться дверь. Список закрыт: новый слой — новое правило. */
export const ENTRY_LAYERS = Object.freeze(['command', 'skill', 'autostart']);

/**
 * @typedef {{command: string, layer: string, witnesses: Array<{layer: string, name: string}>}} MorningEntry
 * @typedef {{ok: boolean, count: number, entries: MorningEntry[], reason: string|null}} EntryVerdict
 */

/**
 * Единственен ли вход в утро.
 *
 * Красное в обе стороны: две команды — старая беда холодной сессии; ноль команд — утро
 * недостижимо, и молчать об этом хуже, чем сказать.
 *
 * @param {Array<{layer?: string, name?: string, command?: string}>} observed
 * @returns {EntryVerdict}
 */
export function judgeMorningEntries(observed) {
  /** @type {MorningEntry[]} */
  const entries = [];
  for (const raw of observed ?? []) {
    const layer = typeof raw?.layer === 'string' ? raw.layer : null;
    const name = typeof raw?.name === 'string' && raw.name.trim() !== '' ? raw.name.trim() : null;
    const command = typeof raw?.command === 'string' && raw.command.trim() !== '' ? raw.command.trim() : null;
    if (!layer || !name || !command) continue;
    if (!ENTRY_LAYERS.includes(layer)) {
      return {
        ok: false,
        count: 0,
        entries: [],
        reason: `слой «${layer}» вне закрытого списка (${ENTRY_LAYERS.join(', ')}) — читать нечего`,
      };
    }
    // Автозапуск — всегда СВОЯ дверь, даже если зовёт ту же команду. Скилл лишь указывает
    // человеку путь, а хук или прогон CI входит в утро САМ: это второй способ войти, и
    // вердикт M4 отверг демона прямо («доступность = свойство активной сессии»). Считать
    // его свидетелем значило бы промолчать о двери, которая открывается без человека.
    const door = layer === 'autostart' ? null : entries.find((e) => e.command === command && e.layer !== 'autostart');
    if (door) {
      if (!door.witnesses.some((w) => w.layer === layer && w.name === name)) door.witnesses.push({ layer, name });
    } else {
      entries.push({ command, layer, witnesses: [{ layer, name }] });
    }
  }

  if (entries.length === 1) return { ok: true, count: 1, entries, reason: null };
  if (entries.length === 0) {
    return { ok: false, count: 0, entries, reason: 'входов в утро не найдено — утро недостижимо' };
  }
  const named = entries.map((e) =>
    e.layer === 'autostart'
      ? `${e.witnesses[0].name} (автозапуск: входит в утро сам, без человека) → ${e.command}`
      : `${e.command} ← ${e.witnesses.map((w) => `${w.name} (${w.layer})`).join(', ')}`);
  return {
    ok: false,
    count: entries.length,
    entries,
    reason: `входов в утро ${entries.length}, должен быть один: ${named.join(' · ')}`,
  };
}

/**
 * Строка встречи о входе — вердикт, а не утверждение.
 *
 * При расхождении называет ВСЕ найденные двери и их свидетелей: «их две» без имён не
 * лечится, читатель всё равно пойдёт искать руками.
 *
 * @param {EntryVerdict} verdict
 * @returns {string}
 */
export function entryLine(verdict) {
  if (!verdict?.ok) return `✖ вход в утро: ${verdict?.reason ?? 'вердикт не вынесен'}`;
  const door = verdict.entries[0];
  const witnesses = door.witnesses.length;
  return `вход в утро единственный (|entry|=1) — ${door.command}, свидетелей ${witnesses}, проверено`;
}
