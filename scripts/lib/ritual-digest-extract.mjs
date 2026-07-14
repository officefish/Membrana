/**
 * Детерминированное извлечение payload дайджеста ритуала для telegram-группы
 * союзников (#428) из артефактов ритма:
 *   - день:  docs/MAIN_DAY_ISSUE.md (ASCII-бокс фокуса дня);
 *   - вечер: docs/seanses/team-evening-feedback-<date>.md (вердикт + предложения).
 *
 * Чистые функции text → payload | null (null = артефакт не распознан, скрипт
 * гасится graceful). Форматирование сообщения живёт в office
 * (`modules/telegram/telegram-format.ts`), здесь — только извлечение.
 */

/** Снять инлайн-markdown: **жирный**, `код`, [текст](url). */
export function stripInlineMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

function collapseSpaces(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/** Содержимое строк ASCII-бокса `│ … │` (обрезанное по краям). */
function boxLines(text) {
  const lines = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*│(.*)│\s*$/);
    if (m) lines.push(m[1].trim());
  }
  return lines;
}

/** Блок соседних непустых строк бокса, начиная с строки-маркера. */
function boxBlock(box, marker) {
  const start = box.findIndex((l) => l.includes(marker));
  if (start === -1) return null;
  const parts = [];
  for (let i = start; i < box.length && box[i] !== ''; i++) parts.push(box[i]);
  return collapseSpaces(parts.join(' ').replaceAll(marker, ''));
}

/**
 * docs/MAIN_DAY_ISSUE.md → payload дня.
 * Возвращает null, если не найдены дата или ⚡-заголовок фокуса.
 */
export function extractDayDigest(text) {
  const date = text.match(/^#\s*MAIN_DAY_ISSUE\s*—\s*(\d{4}-\d{2}-\d{2})/m)?.[1] ?? null;
  const box = boxLines(text);
  if (!date || box.length === 0) return null;

  const headline = boxBlock(box, '⚡');
  if (!headline) return null;

  // «Задача N (…): …» — полный блок до следующей задачи/секции (#434: фактура
  // с «что даст», а не первое предложение).
  const points = [];
  for (let i = 0; i < box.length; i++) {
    const m = box[i].match(/^Задача\s+[\wА-Яа-я]+\s*(?:\([^)]*\))?:\s*(.*)$/);
    if (!m) continue;
    const parts = [m[1]];
    let j = i;
    while (j + 1 < box.length) {
      const next = box[j + 1];
      if (next === '' || /^Задача\s+[\wА-Яа-я]+/.test(next) || /[🎯🟢📦🚫⚡]/u.test(next)) break;
      parts.push(next);
      j += 1;
    }
    points.push(collapseSpaces(parts.join(' ')).replace(/[.;]\s*$/, ''));
    i = j;
  }

  const techFooter = boxBlock(box, '🎯');
  return {
    kind: 'day',
    date,
    headline,
    points: points.slice(0, 8),
    ...(techFooter ? { techFooter } : {}),
  };
}

/**
 * docs/seanses/team-evening-feedback-<date>.md → payload вечера.
 * Возвращает null, если не найдена дата в H1.
 */
export function extractEveningDigest(text) {
  const date = text.match(/^#\s*Team Evening Feedback\s*—\s*(\d{4}-\d{2}-\d{2})/m)?.[1] ?? null;
  if (!date) return null;

  const teamScore = text.match(/\*\*Средний балл команды:\*\*\s*(\S+)/)?.[1];

  const verdictLine = text
    .split(/\r?\n/)
    .find((l) => /^-\s*\*\*Вердикт дня:\*\*/.test(l.trim()));
  const headline = verdictLine
    ? stripInlineMd(verdictLine.trim().replace(/^-\s*\*\*Вердикт дня:\*\*\s*/, ''))
    : 'Вечерний ритуал завершён; подробности — в отчёте команды.';

  // «Сводка предложений на завтра»: нумерованные пункты, берём жирную суть.
  const points = [];
  const summary = text.split(/###\s*Сводка предложений на завтра/)[1]?.split(/\n###\s/)[0];
  if (summary) {
    for (const line of summary.split(/\r?\n/)) {
      const m = line.trim().match(/^\d+\.\s+(.*)$/);
      if (!m) continue;
      const bold = m[1].match(/\*\*(.+?)\*\*/)?.[1] ?? m[1];
      points.push(collapseSpaces(stripInlineMd(bold)).replace(/[.:]\s*$/, ''));
    }
  }

  const tracks = extractEveningTracks(text);

  return {
    kind: 'evening',
    date,
    headline,
    points: points.slice(0, 6),
    ...(teamScore ? { teamScore } : {}),
    ...(tracks.length > 0 ? { tracks } : {}),
  };
}

const EVENING_ROLES = ['Teamlead', 'Структурщик', 'Математик', 'Музыкант', 'Верстальщик'];

/** Первые sentences предложений, жёсткий предел maxChars (детерминированно). */
function firstSentences(text, sentences, maxChars) {
  const parts = text.split(/(?<=\.)\s+/).slice(0, sentences);
  const joined = collapseSpaces(parts.join(' '));
  return joined.length <= maxChars ? joined : `${joined.slice(0, maxChars - 1).trimEnd()}…`;
}

/**
 * «Треки дня» (#434): по каждой роли из team-evening-feedback — выжимка её
 * блока «Итоги дня:» (первые два предложения). Роль без блока пропускается.
 */
export function extractEveningTracks(text) {
  const lines = text.split(/\r?\n/);
  const tracks = [];
  for (const role of EVENING_ROLES) {
    const start = lines.findIndex((l) => l.trim().startsWith(`[${role}]:`));
    if (start === -1) continue;
    const block = [];
    for (let i = start; i < lines.length; i++) {
      const line = lines[i].trim();
      if (i > start && (/^\[/.test(line) || line.startsWith('###'))) break;
      block.push(line);
    }
    const from = block.findIndex((l) => l.startsWith('Итоги дня:'));
    if (from === -1) continue;
    const summaryLines = [];
    for (let i = from; i < block.length; i++) {
      const line = block[i];
      if (i > from && (line === '' || /^(На завтра|Полезность дня|Оценка артефактов):/.test(line))) break;
      summaryLines.push(i === from ? line.replace(/^Итоги дня:\s*/, '') : line);
    }
    const summary = firstSentences(stripInlineMd(summaryLines.join(' ')), 2, 240);
    if (summary) tracks.push(`${role}: ${summary}`);
  }
  return tracks.slice(0, 8);
}

/**
 * Шапка-пояснение дайджеста (#434): содержимое между маркерами
 * `<!-- digest-header:start -->` / `<!-- digest-header:end -->` файла
 * docs/comms/ALLY_DIGEST_HEADER.md. Нет маркеров/пусто → null (graceful,
 * отчёт уходит без шапки).
 */
export function extractDigestHeader(text) {
  const m = text.match(/<!--\s*digest-header:start\s*-->([\s\S]*?)<!--\s*digest-header:end\s*-->/);
  const body = m?.[1]?.trim();
  return body ? body : null;
}
