/**
 * Разбор транскрипта на **упорядоченный список вызовов инструментов**.
 *
 * Зачем отдельный модуль: [`transcript.mjs`](./transcript.mjs) читает РЕПЛИКИ —
 * `extractUtterances` знает записи пользователя и блоки `tool_result`, но блоки `tool_use`
 * не извлекает вовсе. Предикат нормы (§8 контракта `workshop-wires`) спрашивает не «что
 * сказано», а «что и в каком порядке вызвано», и на репликах он невыразим.
 *
 * Аудит заседания назвал это отдельно: цена подпорки нормы была занижена — «регулярным
 * прогоном существующего» она не делается, парсера событий вызова в репозитории не было
 * даже в зачаточном виде.
 *
 * ЧТО МОДУЛЬ НЕ ДЕЛАЕТ. Он не судит, УМЕСТЕН ли вызов и не читает `input` вызова: содержимое
 * аргументов — это уже смысл работы, а не факт обращения. Он отвечает на один вопрос —
 * какими инструментами и в каком порядке сессия пользовалась.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Инструменты, вызов которых считается **разведочным поиском по дереву**.
 *
 * Список закрыт и намеренно узок: сюда входит только то, чем ищут ВСЛЕПУЮ. `Read` не входит —
 * чтение известного файла разведкой не является; §8 прямо говорит, что поиск по коду текущей
 * задачи при известном инструменте не запрещён.
 */
export const SEARCH_TOOLS = Object.freeze(['Grep', 'Glob']);

/**
 * Признак вызова мастерской: `yarn <глагол>` либо `node scripts/…` внутри команды оболочки.
 *
 * Мастерская зовётся ЧЕРЕЗ оболочку, а не отдельным типом события, поэтому распознавание
 * идёт по тексту команды. Это грубо и признано таковым: `git status` через `Bash` вызовом
 * мастерской не считается, а `yarn scripts:orphans` считается.
 */
const WORKSHOP_CALL_RE = /(^|[\s;|&(])(yarn\s+[a-z][\w:-]*|node\s+scripts\/[\w./-]+)/u;

/** Оболочечные инструменты, чью команду имеет смысл читать. */
const SHELL_TOOLS = Object.freeze(['Bash']);

/**
 * Разобрать ОДНУ запись транскрипта в список вызовов.
 *
 * @param {unknown} record
 * @returns {{name: string, kind: string, command: string|null}[]}
 */
export function toolUsesOfRecord(record) {
  const content = /** @type {any} */ (record)?.message?.content;
  if (!Array.isArray(content)) return [];
  const out = [];
  for (const block of content) {
    if (block?.type !== 'tool_use') continue;
    const name = typeof block.name === 'string' ? block.name : '(без имени)';
    const command = SHELL_TOOLS.includes(name) && typeof block.input?.command === 'string'
      ? block.input.command
      : null;
    out.push({ name, kind: classifyCall(name, command), command });
  }
  return out;
}

/**
 * Род вызова. Список ЗАКРЫТ: `search` · `workshop` · `other`.
 *
 * `other` — честный третий исход, а не свалка: чтение файла, правка, запуск теста не являются
 * ни разведкой, ни обращением к мастерской, и записывать их в одно из двух значило бы
 * подгонять числитель под предикат.
 */
export function classifyCall(name, command = null) {
  if (SEARCH_TOOLS.includes(name)) return 'search';
  if (command !== null && WORKSHOP_CALL_RE.test(command)) return 'workshop';
  // Оболочка с грепом внутри — та же разведка, только руками мимо инструмента.
  if (command !== null && /(^|[\s;|&(])(grep|rg|find)\s/u.test(command)) return 'search';
  return 'other';
}

/**
 * Признаки сессии по её транскрипту.
 *
 * `firstActionWasSearch` считается по ПЕРВОМУ вызову рода `search` или `workshop`, а не по
 * первому вызову вообще: сессия почти всегда начинается с чтения файла или запуска теста, и
 * «первым действием» в смысле нормы является первый содержательный ход к поиску инструмента.
 * Иначе предикат мерил бы, кто как разогревается, а не кто как ищет.
 *
 * @param {readonly unknown[]} records
 * @returns {{calls: number, search: number, workshop: number, other: number,
 *            firstActionWasSearch: boolean|null, hasWorkshopCall: boolean, tools: string[]}}
 */
export function sessionSignals(records) {
  const calls = [];
  for (const r of records ?? []) calls.push(...toolUsesOfRecord(r));
  const meaningful = calls.filter((c) => c.kind !== 'other');
  const tools = [...new Set(calls.map((c) => c.name))].sort();
  return {
    calls: calls.length,
    search: calls.filter((c) => c.kind === 'search').length,
    workshop: calls.filter((c) => c.kind === 'workshop').length,
    other: calls.filter((c) => c.kind === 'other').length,
    // null, а не false: «содержательных ходов не было» ≠ «начали не с поиска». Сессия без
    // единого поискового или мастерского вызова в предикат нормы не входит вовсе.
    firstActionWasSearch: meaningful.length === 0 ? null : meaningful[0].kind === 'search',
    hasWorkshopCall: calls.some((c) => c.kind === 'workshop'),
    tools,
  };
}

/** Прочитать JSONL-транскрипт, пропуская битые строки. */
export function readTranscript(file) {
  const records = [];
  let broken = 0;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim() === '') continue;
    try { records.push(JSON.parse(line)); } catch { broken += 1; }
  }
  return { records, broken };
}

/**
 * Сессии каталога транскриптов с признаками и метками времени.
 *
 * Время берётся из `mtime` файла, а не из содержимого: метка внутри записей своя у каждого
 * клиента, и разбирать их разнобой ради окна в 28 дней — работа, которой предикат не требует.
 * Это названный предел, а не недосмотр: сессия, дописанная позже, попадёт в окно по последней
 * записи.
 *
 * @param {string} dir
 * @returns {{sessionId: string, at: number, signals: object, broken: number}[]}
 */
export function scanSessions(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.jsonl')) continue;
    const file = join(dir, name);
    const { records, broken } = readTranscript(file);
    out.push({
      sessionId: name.replace(/\.jsonl$/u, ''),
      at: statSync(file).mtimeMs,
      signals: sessionSignals(records),
      broken,
    });
  }
  return out.sort((a, b) => a.at - b.at);
}
