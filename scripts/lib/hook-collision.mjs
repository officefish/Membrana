/**
 * Коллизия хука с каноном — **обнаружение, а не починка**.
 *
 * Хук `SessionStart`, поставленный `codebase-memory-mcp`, вгружает в контекст до первой
 * реплики требование «ALWAYS use codebase-memory-mcp tools FIRST for ANY code exploration».
 * Норма в `AGENTS.md` требует первым глагол мастерской. До 31.07 приоритет между ними не был
 * записан нигде, и холодная сессия решала его на ходу
 * ([`PRIORITY_HOOK_CANON`](../../docs/meeting/workshop-wires/PRIORITY_HOOK_CANON.md)).
 *
 * ПОЧЕМУ ТОЛЬКО ЧТЕНИЕ. Файл хука живёт вне репозитория (`~/.claude/hooks/`) и порождён
 * установщиком MCP — третья строка гласит «Installed by codebase-memory-mcp». Правка молча
 * откатится при следующем обновлении: артефакт будет выглядеть правдой и перестанет ею быть
 * без сигнала. Плюс файл общий для всех репозиториев владельца — скрипт одного проекта,
 * меняющий поведение агентов в чужих, стоит вне версионирования и вне ревью.
 *
 * Поэтому здесь та же форма, что у трёх разниц дрейфа справочника: чужой артефакт не трогаем,
 * расхождение с ним называем.
 *
 * ЧЕСТНЫЙ ПРЕДЕЛ. Проверка **не заставит** хук измениться и не судит, кто прав. Она отвечает
 * на один вопрос: записан ли приоритет между двумя требованиями — и если нет, называет оба
 * текста, чтобы спор шёл о цитатах, а не о памяти.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Состояния сверки. Список ЗАКРЫТ. */
export const COLLISION_STATES = Object.freeze({
  /** Хук требует своё, канон отвечает приоритетом — коллизия разведена. */
  RESOLVED: 'resolved',
  /** Хук требует своё, канон молчит — та самая дыра 31.07. */
  UNRESOLVED: 'unresolved',
  /** Хука на этой машине нет. НЕ ошибка: у другого разработчика MCP может быть не установлен. */
  NO_HOOK: 'no_hook',
  /** Канон не прочитался — сверять не с чем. */
  NO_CANON: 'no_canon',
});

/** Каталог пользовательских хуков. */
export const HOOKS_DIR = join(homedir(), '.claude', 'hooks');

/**
 * Признак требования «первым» в тексте хука.
 *
 * Ловится СМЫСЛ, а не точная строка: вендор волен переписать формулировку, и привязка к
 * дословной фразе дала бы ложное «коллизии нет» на первом же обновлении. Поэтому пара
 * «FIRST/ALWAYS» рядом с «exploration/search» — и то же по-русски.
 */
const DEMANDS_FIRST_RE = /\b(ALWAYS|FIRST)\b[\s\S]{0,120}?\b(exploration|explore|search|discovery)\b/iu;

/** Признак того, что канон приоритет ЗАПИСАЛ. */
const CANON_RESOLVES_RE = /codebase-memory-mcp\s*—\s*разведка|разведка, а не прибор/iu;

/**
 * Найти файлы хуков, требующих «первым».
 *
 * Обход каталога, а не проверка одного имени: хук `cbm-session-reminder` — сегодняшний
 * носитель, но завтра установщик может назвать файл иначе, и проверка, привязанная к имени,
 * молча перестала бы находить коллизию.
 */
export function findDemandingHooks(dir = HOOKS_DIR) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    let text = '';
    try { text = readFileSync(path, 'utf8'); } catch { continue; }
    if (DEMANDS_FIRST_RE.test(text)) {
      const m = text.match(DEMANDS_FIRST_RE);
      out.push({ name, path, quote: m[0].replace(/\s+/gu, ' ').trim().slice(0, 160) });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Сверить хуки с каноном.
 *
 * @param {{canonText?: string|null, hooksDir?: string}} [opts]
 * @returns {{state: string, hooks: object[], reason: string}}
 */
export function checkHookCollision(opts = {}) {
  const { canonText = null, hooksDir = HOOKS_DIR } = opts;
  const hooks = findDemandingHooks(hooksDir);

  if (hooks.length === 0) {
    // Ни один хук не требует «первым» — сверять нечего, и это не повод краснеть.
    return { state: COLLISION_STATES.NO_HOOK, hooks: [], reason: 'хуков с требованием «первым» не найдено — MCP не установлен либо формулировка изменилась' };
  }
  if (typeof canonText !== 'string' || canonText.trim() === '') {
    return { state: COLLISION_STATES.NO_CANON, hooks, reason: 'канон не прочитан — сверять не с чем' };
  }
  if (CANON_RESOLVES_RE.test(canonText)) {
    return { state: COLLISION_STATES.RESOLVED, hooks, reason: 'канон называет codebase-memory-mcp разведкой и ставит глагол мастерской впереди' };
  }
  return {
    state: COLLISION_STATES.UNRESOLVED,
    hooks,
    reason: 'хук требует «первым», канон об этом молчит — приоритет не записан',
  };
}

/**
 * Отчёт словами.
 *
 * При неразведённой коллизии печатаются ОБА текста: спор должен идти о цитатах, а не о
 * памяти. Именно нехватка цитаты рядом с нормой стоила холодной сессии 31.07 решения на ходу.
 */
export function renderCollision(result) {
  const lines = [];
  switch (result.state) {
    case COLLISION_STATES.RESOLVED:
      lines.push(`коллизия хук↔канон: разведена · хуков с требованием «первым»: ${result.hooks.length}`);
      for (const h of result.hooks) lines.push(`    ${h.name}`);
      break;
    case COLLISION_STATES.UNRESOLVED:
      lines.push('✖ коллизия хук↔канон НЕ разведена — приоритет не записан');
      for (const h of result.hooks) {
        lines.push(`    ${h.name}: «${h.quote}»`);
      }
      lines.push('    канон о порядке между мастерской и разведкой молчит — записать в AGENTS.md');
      lines.push('    правка самого хука репозиторием НЕ делается: файл вендорный и общий для всех проектов');
      break;
    case COLLISION_STATES.NO_HOOK:
      lines.push(`коллизия хук↔канон: ${result.reason}`);
      break;
    default:
      lines.push(`✖ коллизия хук↔канон: ${result.reason}`);
  }
  return lines;
}
