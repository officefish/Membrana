/**
 * session-mining — чистое ядро добычи сырья из JSONL-транскриптов Claude Code
 * (скилл membrana-case-mining; родился в исследовании первого мостика 27.07,
 * PR #1349: пять кейсов-кандидатов из сессии 7f931953).
 *
 * Закон Raw: цитата существует только с указателем {sessionId, uuid, timestamp};
 * реплика — только события type user/assistant с маркером В ТЕКСТЕ реплики
 * (не в tool-результате); дата эпизода — из timestamp события, не из даты файла
 * (сессия может покрывать двое суток).
 *
 * Ни ФС, ни процессов — вход строки/объекты, обвязка снаружи.
 */

/** Текст реальной реплики события или null (системные/tool-события — не реплики). */
export function replyText(event) {
  if (!event || (event.type !== 'user' && event.type !== 'assistant')) return null;
  const c = event.message?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    const t = c.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
    return t || null;
  }
  return null;
}

/** Маркер в тексте реплики (не в служебных полях строки). */
export function matchesInReply(event, needle) {
  const t = replyText(event);
  return t != null && t.includes(needle);
}

/** Попадает ли событие в окно времени [from, to] (ISO-строки, поддержаны префиксы). */
export function inWindow(event, from, to) {
  const ts = event?.timestamp;
  if (!ts) return false;
  if (from && ts < from) return false;
  if (to && ts > to) return false;
  return true;
}

/** Указатель Raw — обязательная форма ссылки на цитату. */
export function formatPointer(event, sessionId) {
  return `{sessionId: ${sessionId}, uuid: ${event.uuid}, timestamp: ${event.timestamp}}`;
}

/** Фрагмент вокруг первого вхождения маркера (для беглого чтения; Raw цитируется полностью). */
export function fragmentAround(text, needle, before = 400, after = 600) {
  const idx = text.indexOf(needle);
  if (idx < 0) return text.slice(0, before + after);
  return text.slice(Math.max(0, idx - before), idx + after);
}

/**
 * Свёртка одной строки транскрипта в состояние инвентаря: первая/последняя метка
 * времени + счётчики маркеров. Маркер здесь считается ПО СТРОКЕ (грубый счёт для
 * сортировки сессий) — точность «в реплике» даёт extract, не scan.
 * @param {string} line @param {string[]} markers
 * @param {{first: string|null, last: string|null, counts: Record<string, number>}} state
 */
export function foldScanLine(line, markers, state) {
  const m = line.match(/"timestamp":"([^"]+)"/u);
  if (m) {
    if (!state.first) state.first = m[1];
    state.last = m[1];
  }
  for (const marker of markers) {
    if (line.includes(marker)) state.counts[marker] = (state.counts[marker] ?? 0) + 1;
  }
  return state;
}

/** Имя сессии из имени файла транскрипта. */
export function sessionIdOf(fileName) {
  return String(fileName).replace(/\.jsonl$/u, '');
}
