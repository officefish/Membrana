/**
 * Детерминированное извлечение payload дайджеста ритуала для telegram-группы
 * союзников (#428) из артефактов ритма:
 *   - день:  docs/MAIN_DAY_ISSUE.md (ASCII-бокс фокуса + таблица «Issues в скоупе»);
 *   - вечер: docs/seanses/team-evening-feedback-<date>.md (вердикт + итоги против плана).
 *
 * v3 (ALLY_DIGEST_FORMAT.md): тезисная структура.
 *   день:  центральная задача · высокий приоритет · перспективы · критерий вечера;
 *   вечер: вердикт · сошлось · не сошлось · неожиданно · оценка.
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

/** Блок соседних непустых строк бокса, начиная со строки-маркера. */
function boxBlock(box, marker) {
  const start = box.findIndex((l) => l.includes(marker));
  if (start === -1) return null;
  const parts = [];
  for (let i = start; i < box.length && box[i] !== ''; i++) parts.push(box[i]);
  return collapseSpaces(parts.join(' ').replaceAll(marker, ''));
}

/**
 * Тезис из ячейки таблицы Issues: `#476 п.1 (merge-driver реестра)` →
 * `merge-driver реестра (#476)`. Номер выносим в хвост, описание из скобок.
 */
function cleanIssueItem(raw) {
  const m = collapseSpaces(raw).match(/^#(\d+)\b\s*(.*)$/);
  if (!m) return collapseSpaces(raw);
  const num = m[1];
  const rest = m[2];
  const paren = rest.match(/\(([^)]+)\)/);
  let desc = (paren ? paren[1] : rest).replace(/^п\.\d+\s*/, '').trim();
  desc = desc.replace(/[.,;]\s*$/, '');
  return desc ? `${desc} (#${num})` : `#${num}`;
}

/** Разбить ячейку `#a (..), #b (..)` на отдельные issue-тезисы. */
function splitIssueCell(cell) {
  const raw = cell.match(/#\d+[^#]*/g);
  const source = raw && raw.length > 0 ? raw : cell.split(/\s*[;,]\s*/);
  return source.map((s) => cleanIssueItem(s.replace(/[;,]\s*$/, ''))).filter(Boolean);
}

/**
 * Таблица «## 🔗 Issues в скоупе» → [{ label, items }]. Строки-заголовок и
 * разделитель отбрасываются. Пусто, если секции нет.
 */
function extractIssuesTable(text) {
  const section = text.split(/##\s*[^\n]*Issues в скоупе/)[1]?.split(/\n##\s/)[0];
  if (!section) return [];
  const rows = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(/^\|(.+?)\|(.+?)\|\s*$/);
    if (!m) continue;
    const label = stripInlineMd(m[1].trim());
    const cell = m[2].trim();
    if (!label || /^-+$/.test(label) || /^приоритет$/i.test(label)) continue;
    rows.push({ label, items: splitIssueCell(cell) });
  }
  return rows;
}

/** Тело секции `## <title>` до следующего `##`/конца. Пусто/«— пусто —» → null. */
function slotSection(text, title) {
  const re = new RegExp(`^##\\s+${title}\\s*$\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, 'mu');
  const body = String(text ?? '').match(re)?.[1]?.trim() ?? '';
  if (!body || /^—\s*пусто\s*—$/u.test(body)) return null;
  return body;
}

/** Буллеты секции (строки `- …`), очищенные от md. */
function slotBullets(text, title) {
  const body = slotSection(text, title);
  if (!body) return [];
  return body
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*[-*•]\s+(.*)$/u)?.[1])
    .filter(Boolean)
    .map((s) => stripInlineMd(collapseSpaces(s)));
}

/**
 * Новый 5-блочный формат (K, вердикт M2): заголовки слотов детерминированы каркасом
 * (`frame()` в day-plan-frame.mjs — здесь имена продублированы строками, чтобы lib
 * оставалась без зависимости от каркаса; гейт скелета в генераторе держит их в синхроне).
 * headline = первая фраза Магистрали; highPriority = Подкрепление; perspective = Перспективные.
 */
export function extractDayDigestSlots(text) {
  const src = String(text ?? '');
  const date =
    src.match(/^#\s*(?:MAIN_DAY_ISSUE|Центральная задача дня)\s*—\s*(\d{4}-\d{2}-\d{2})/mu)?.[1] ??
    src.match(/<!--\s*Сгенерировано:\s*(\d{4}-\d{2}-\d{2})/u)?.[1] ??
    null;
  const magistral = slotSection(src, 'Магистраль');
  if (!date || !magistral) return null;
  const headline = stripInlineMd(collapseSpaces(magistral.split(/\n/)[0])).replace(/[.;]\s*$/u, '');
  const highPriority = slotBullets(src, 'Подкрепление');
  const perspective = slotBullets(src, 'Перспективные');
  return {
    kind: 'day',
    date,
    headline,
    ...(highPriority.length > 0 ? { highPriority: highPriority.slice(0, 4) } : {}),
    ...(perspective.length > 0 ? { perspective: perspective.slice(0, 4) } : {}),
  };
}

/**
 * docs/MAIN_DAY_ISSUE.md → payload дня. Сначала новый 5-блочный формат (K);
 * фолбэк — старый бокс-формат. Возвращает null, если не распознан ни один.
 */
export function extractDayDigest(text) {
  const slots = extractDayDigestSlots(text);
  if (slots) return slots;
  const date = text.match(/^#\s*MAIN_DAY_ISSUE\s*—\s*(\d{4}-\d{2}-\d{2})/m)?.[1] ?? null;
  const box = boxLines(text);
  if (!date || box.length === 0) return null;

  // Центральная задача: «Одна фраза дня» (простой язык) с фолбэком на ⚡-заголовок.
  const phrase = text.match(/\*\*Одна фраза дня:\*\*\s*([\s\S]*?)(?:\n\n|\n---|\n##)/)?.[1];
  const headline = phrase
    ? stripInlineMd(collapseSpaces(phrase)).replace(/[.;]\s*$/, '')
    : boxBlock(box, '⚡');
  if (!headline) return null;

  const rows = extractIssuesTable(text);
  const highPriority = [];
  const perspective = [];
  for (const { label, items } of rows) {
    if (/отложено/i.test(label)) {
      if (/пост/i.test(label)) perspective.push(...items);
      continue; // «Отложено (долг)» — длинный бэклог, в дайджест не идёт
    }
    if (/магистраль|критпуть|side/i.test(label)) highPriority.push(...items);
  }

  // Критерий вечера: строка «🎯 Критерий вечера: …» из бокса.
  const criterionBlock = boxBlock(box, '🎯');
  const eveningCriterion = criterionBlock
    ? collapseSpaces(criterionBlock.replace(/^Критерий вечера:\s*/i, '')).replace(/[.;]\s*$/, '')
    : null;

  return {
    kind: 'day',
    date,
    headline,
    ...(highPriority.length > 0 ? { highPriority: highPriority.slice(0, 4) } : {}),
    ...(perspective.length > 0 ? { perspective: perspective.slice(0, 4) } : {}),
    ...(eveningCriterion ? { eveningCriterion } : {}),
  };
}

/** Булиты `- …` под жирной меткой `**<label>:**` до следующей метки/секции. */
function bulletsUnder(text, label) {
  const re = new RegExp(`\\*\\*${label}[^*]*\\*\\*\\s*\\n([\\s\\S]*?)(?:\\n\\s*\\*\\*|\\n###|\\n##|$)`, 'i');
  const block = text.match(re)?.[1];
  if (!block) return [];
  const items = [];
  for (const line of block.split(/\r?\n/)) {
    const m = line.trim().match(/^[-•]\s+(.*)$/);
    if (m) items.push(collapseSpaces(stripInlineMd(m[1])).replace(/[.;]\s*$/, ''));
  }
  return items;
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
    : 'Вечерний ритуал завершён; подробности — в приложенном отчёте.';

  // «### Итоги против плана»: три размеченных подсписка (ALLY_DIGEST_FORMAT.md).
  const outcome = text.split(/###\s*Итоги против плана/)[1]?.split(/\n###\s/)[0] ?? '';
  const converged = bulletsUnder(outcome, 'Сошлось');
  const notConverged = bulletsUnder(outcome, 'Не сошлось');
  const unexpected = bulletsUnder(outcome, 'Неожиданно');

  return {
    kind: 'evening',
    date,
    headline,
    ...(converged.length > 0 ? { converged: converged.slice(0, 4) } : {}),
    ...(notConverged.length > 0 ? { notConverged: notConverged.slice(0, 4) } : {}),
    ...(unexpected.length > 0 ? { unexpected: unexpected.slice(0, 4) } : {}),
    ...(teamScore ? { teamScore } : {}),
  };
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
