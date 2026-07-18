/**
 * Обход дорожной карты заседания: где мы, что следующее, далеко ли до конца.
 *
 * Регламент: `docs/MEETING_REGULATION.md`.
 *
 * ПОЧЕМУ ЧИСТАЯ ФУНКЦИЯ, А НЕ ФАЙЛ СОСТОЯНИЯ. Первый прогон формата (M0
 * `meeting-format`, 17.07) дал `MEETING_ACTIVE.md`, который противоречил сам себе:
 * «Статус: идёт» + «вердикт: ожидается» + «M0 отработал — вердикт есть» одновременно.
 * Причина не в невнимательности: рукописное состояние поедет всегда, потому что его
 * надо помнить обновить. Здесь хранится ТОЛЬКО дорожная карта (ратифицированный
 * порядок), а прогресс ВЫЧИСЛЯЕТСЯ из наличия вердиктов — по правилу канона «не
 * хранить правду, хранить, как её перепроверить».
 *
 * ЧТО СЧИТАЕТСЯ ЗАКРЫТЫМ. Не «ярлык вопроса встретился в протоколе» — это меряет
 * `findUncoveredAgendaItems`, и на первом же прогоне он дал ложное срабатывание
 * (команда выдала вердикт, не назвав ярлык `O1`; эрратум к S-M2). Закрытость решает
 * вызывающий: он передаёт `closed` — множество узлов, чей протокол прошёл
 * `validateProtocol` (есть секция итога, роли высказались, реплик не меньше порога).
 * Ядро о файлах не знает.
 */

/**
 * @typedef {{ id: string, label: string, dependsOn?: string[] }} MeetingNode
 */

/**
 * Дефекты самой карты. Карта с циклом не пройдётся никогда — а «никогда» обязано
 * быть видно ДО прогонов, а не после сожжённого кредита.
 * @returns {string[]} пустой массив = карта проходима
 */
export function roadmapProblems(nodes) {
  const list = Array.isArray(nodes) ? nodes : [];
  const problems = [];
  const ids = list.map((n) => n?.id);

  for (const [i, id] of ids.entries()) {
    if (!id) problems.push(`узел #${i + 1} без id`);
    else if (ids.indexOf(id) !== i) problems.push(`дубль id: ${id}`);
  }

  const known = new Set(ids.filter(Boolean));
  for (const n of list) {
    for (const dep of n?.dependsOn ?? []) {
      if (!known.has(dep)) problems.push(`${n.id} зависит от несуществующего узла: ${dep}`);
      if (dep === n.id) problems.push(`${n.id} зависит от самого себя`);
    }
  }

  for (const cycle of findCycles(list)) {
    problems.push(`цикл: ${cycle.join(' → ')}`);
  }
  return problems;
}

/** Циклы в графе зависимостей (обход в глубину с цветами). */
function findCycles(nodes) {
  const byId = new Map(nodes.filter((n) => n?.id).map((n) => [n.id, n]));
  const state = new Map(); // white (нет записи) | gray | black
  const cycles = [];
  const stack = [];

  const visit = (id) => {
    if (state.get(id) === 'black') return;
    if (state.get(id) === 'gray') {
      const from = stack.indexOf(id);
      if (from !== -1) cycles.push([...stack.slice(from), id]);
      return;
    }
    state.set(id, 'gray');
    stack.push(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) {
      if (byId.has(dep)) visit(dep);
    }
    stack.pop();
    state.set(id, 'black');
  };

  for (const id of byId.keys()) visit(id);
  return cycles;
}

/**
 * Где заседание находится прямо сейчас.
 *
 * @param {{ nodes: MeetingNode[], closed?: Iterable<string> }} input
 * @returns {{
 *   done: string[],       // вердикт есть
 *   ready: string[],      // можно созывать: все зависимости закрыты (Hard rule 3)
 *   blocked: Array<{ id: string, waitingFor: string[] }>,
 *   complete: boolean,    // все узлы закрыты — заседание дошло до конца
 *   progress: string,     // «3/10»
 *   problems: string[],   // дефекты карты; непусто → обходу верить нельзя
 * }}
 */
export function computeMeetingWalk({ nodes, closed = [] } = {}) {
  const list = Array.isArray(nodes) ? nodes : [];
  const problems = roadmapProblems(list);
  const closedSet = new Set(closed);

  const done = [];
  const ready = [];
  const blocked = [];

  for (const n of list) {
    if (!n?.id) continue;
    if (closedSet.has(n.id)) {
      done.push(n.id);
      continue;
    }
    const waitingFor = (n.dependsOn ?? []).filter((d) => !closedSet.has(d));
    if (waitingFor.length === 0) ready.push(n.id);
    else blocked.push({ id: n.id, waitingFor });
  }

  const total = list.filter((n) => n?.id).length;
  return {
    done,
    ready,
    blocked,
    // Дефектная карта не бывает пройденной: цикл не даёт заключать о конце.
    complete: problems.length === 0 && total > 0 && done.length === total,
    progress: `${done.length}/${total}`,
    problems,
  };
}

/**
 * Тупик: не пройдено, но и созывать нечего. Заседание не дойдёт до конца само —
 * нужен владелец. Без этой проверки «дорожная карта» молча зависает, а молчание
 * читается как «идёт по плану» (ошибка `|| true`).
 */
export function isStalled(walk) {
  return !walk.complete && walk.ready.length === 0 && walk.blocked.length > 0;
}
