/**
 * standup-routing — роутинг талантов для DAILY_STANDUP (спринт standup-charge-redesign).
 *
 * Замысел владельца 16.07: стендап должен ЗАРЯЖАТЬ — подсветить сильную сторону
 * каждой персоны и дать ей задачу, где эта сторона нужна. Раньше стендап был
 * механическим сведением доков в пять секций: одни и те же абзацы каждый день,
 * «магическая кнопка» (реплика Музыканта на консилиуме).
 *
 * Консилиум `standup-charge-2026-07-16`:
 *   • роутинг — ЧИСТАЯ функция `openTasks × leadPersona/supportPersonas ×
 *     компетенции VIRTUAL_TEAM_PROMPT`. Детерминизм, без LLM на матчинге;
 *   • самооценка (`usefulness` из team-evening-feedback) во вход НЕ входит —
 *     только объективный факт (открытые задачи, участие/простой);
 *   • второго реестра компетенций НЕ заводим — парсим существующую таблицу;
 *   • пустое состояние — ЧЕСТНАЯ строка, не выдуманная задача;
 *   • task-id только из реестра (паттерн `main-day-probe`: не выдумывать).
 *
 * Research Q2 отвечал про людей (Gallup, «состояние потока», «прилив энергии») —
 * у LLM-персоны их нет. Поэтому вход роутинга — факты реестра, не мотивация.
 */

/**
 * Канонизация идентификатора персоны.
 *
 * В реестре персона Музыканта живёт под ДВУМЯ именами: `musician` (9 активных
 * задач) и `kuryokhin` (1) — роутинг по одному slug молча потерял бы девять.
 * Ключи ролей приходят из `CONSILIUM_ROLE_KEY_TO_SLUG` (@see persona-memory).
 */
export const PERSONA_ALIASES = {
  teamlead: 'vesnin',
  structurer: 'ozhegov',
  mathematician: 'dynin',
  musician: 'kuryokhin',
  layout: 'rodchenko',
  // Ведущая персона (cowork-execution-registry, контракт §1.1): `angelina` —
  // допустимое значение leadPersona/acceptedBy. НЕ шестая советующая: в
  // консилиум-роутинге и ask не участвует, псевдонимов роли не имеет —
  // тождественная запись фиксирует её в каноне реестра псевдонимов.
  angelina: 'angelina',
};

/** @param {string} id */
export function normalizePersona(id) {
  const key = String(id ?? '').trim().toLowerCase();
  return PERSONA_ALIASES[key] ?? key;
}

/**
 * Компетенции ролей из таблицы «Роли (кратко)» в `VIRTUAL_TEAM_PROMPT.md`.
 *
 * Формат строки: `| **Роль** | сильные стороны | анти-паттерны |`.
 * Второго реестра компетенций не заводим (запрет консилиума, `ozhegov`):
 * источник один, иначе разъедется как разъехался инвентарь тулинга.
 *
 * @param {string} virtualTeamMd
 * @returns {readonly {role: string, strengths: string}[]}
 */
export function parseRoleCompetencies(virtualTeamMd) {
  const out = [];
  for (const line of String(virtualTeamMd ?? '').split(/\r?\n/u)) {
    const m = line.match(/^\|\s*\*\*([^*|]+)\*\*\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/u);
    if (!m) continue;
    const role = m[1].trim();
    const strengths = m[2].trim();
    // Отсекаем таблицу участников (там во 2-й колонке — имя персонажа со ссылкой).
    if (/^\*{0,2}[A-ZА-Я][a-zа-я]+\*{0,2}\s*\(/u.test(strengths)) continue;
    if (!strengths || strengths.length < 10) continue;
    out.push({ role, strengths });
  }
  return out;
}

/** Slug персоны для роли из таблицы участников (`| **Роль** | **Имя** (…) | `slug` |`). */
export function parseRoleSlugs(virtualTeamMd) {
  const out = {};
  for (const line of String(virtualTeamMd ?? '').split(/\r?\n/u)) {
    const m = line.match(/^\|\s*\*\*([^*|]+)\*\*\s*\|[^|]*\|\s*`([a-z-]+)`\s*\|/u);
    if (m) out[m[1].trim()] = m[2];
  }
  return out;
}

/**
 * Задачи персоны из реестра: где она lead, где support.
 *
 * Только `active` — стендап смотрит вперёд. Порядок реестра сохраняется:
 * это делает выбор детерминированным без выдуманного приоритета.
 */
export function personaTasks(registry, persona) {
  const slug = normalizePersona(persona);
  const active = (registry?.tasks ?? []).filter((t) => t.status === 'active');
  const lead = active.filter((t) => normalizePersona(t.leadPersona) === slug);
  const support = active.filter(
    (t) =>
      normalizePersona(t.leadPersona) !== slug &&
      (t.supportPersonas ?? []).some((p) => normalizePersona(p) === slug),
  );
  return { lead, support };
}

/**
 * Детерминированный выбор задачи дня для персоны.
 *
 * Правило: сначала где персона ВЕДЁТ, иначе где поддерживает; внутри — порядок
 * реестра. Никакой «важности» и никакой самооценки: вход только объективный.
 * Одинаковый реестр → одинаковый выбор (требование DoD).
 */
export function pickTaskForPersona(registry, persona) {
  const { lead, support } = personaTasks(registry, persona);
  const pool = lead.length > 0 ? lead : support;
  if (pool.length === 0) return null;
  return {
    task: pool[0],
    role: lead.length > 0 ? 'ведёт' : 'поддерживает',
    more: pool.length - 1,
  };
}

/** Дата последней записи журнала персоны — provenance «факт вчера». */
export function lastMemoryDate(memoryMd) {
  const dates = [...String(memoryMd ?? '').matchAll(/^###\s+(\d{4}-\d{2}-\d{2})/gmu)].map((m) => m[1]);
  return dates.length > 0 ? dates.sort().at(-1) : null;
}

/**
 * Строки роутинга — по одной на персону.
 *
 * @param {{ registry: object, virtualTeamMd: string, memories: Record<string,string> }} input
 * @returns {readonly {persona: string, role: string, strengths: string,
 *   taskId: string|null, assignment: string|null, more: number, provenance: string|null}[]}
 */
export function buildStandupRouting({ registry, virtualTeamMd, memories = {} }) {
  const competencies = parseRoleCompetencies(virtualTeamMd);
  const slugs = parseRoleSlugs(virtualTeamMd);
  return competencies.map((c) => {
    const persona = normalizePersona(slugs[c.role] ?? c.role);
    const picked = pickTaskForPersona(registry, persona);
    return {
      persona,
      role: c.role,
      strengths: c.strengths,
      taskId: picked?.task?.id ?? null,
      assignment: picked?.role ?? null,
      more: picked?.more ?? 0,
      provenance: lastMemoryDate(memories[persona]) ?? null,
    };
  });
}

/**
 * Гейт против выдуманных задач (паттерн `main-day-probe`).
 *
 * Генератор не имеет права назвать task-id, которого нет в реестре: это ровно
 * тот класс, что подвёл 16.07 — документ звучит уверенно и врёт.
 *
 * @returns {readonly string[]} выдуманные id (пусто — всё честно)
 */
export function findInventedTaskIds(routing, registry) {
  const known = new Set((registry?.tasks ?? []).map((t) => t.id));
  return (routing ?? [])
    .map((r) => r.taskId)
    .filter((id) => id !== null && !known.has(id));
}

/**
 * Пять персональных строк: сила × задача × provenance.
 *
 * Пустое состояние — ЧЕСТНАЯ строка, не пропуск и не выдуманная задача
 * (требование консилиума; a11y-принцип Rodchenko: состояние, а не тишина).
 */
export function formatStandupRouting(routing) {
  return (routing ?? [])
    .map((r) => {
      const strength = r.strengths.split(';')[0].trim();
      if (!r.taskId) {
        return `- **${r.role}** · сила: ${strength} · **нет подходящей активной задачи** — свободен для нового`;
      }
      const more = r.more > 0 ? ` (ещё ${r.more})` : '';
      const prov = r.provenance ? ` · последняя запись журнала: ${r.provenance}` : ' · журнала нет';
      return `- **${r.role}** · сила: ${strength} · ${r.assignment}: \`${r.taskId}\`${more}${prov}`;
    })
    .join('\n');
}

/** Путь нормы — стендап ССЫЛАЕТСЯ, не копирует (иначе стена повторяющегося текста). */
export const STANDUP_NORMS_REL = 'docs/virtual-team/STANDUP_NORMS.md';

/**
 * Секция стендапа целиком: роутинг + свёрнутая ссылка на норму.
 *
 * Норма не копируется в тело — её печать каждый день делает документ нечитаемым
 * («магическая кнопка»: красиво, и никто не слушает на второй день).
 */
export function formatStandupSection(routing) {
  return [
    '## Роутинг персон (вычислено из реестра, не моделью)',
    '',
    formatStandupRouting(routing),
    '',
    `> Сила — из таблицы ролей \`VIRTUAL_TEAM_PROMPT.md\`; задача — из \`registry.json\``,
    '> (`leadPersona`/`supportPersonas`); provenance — дата последней записи журнала персоны.',
    '> Самооценка полезности во вход НЕ входит: вход роутинга — только объективный факт.',
    '',
    `<details><summary>Нормы команды (дисциплина, честность, код-стайл, таланты)</summary>`,
    '',
    `Канон — [\`${STANDUP_NORMS_REL}\`](../${STANDUP_NORMS_REL.replace('docs/', '')}). Стендап на него **ссылается, не копирует**.`,
    '',
    '</details>',
  ].join('\n');
}
