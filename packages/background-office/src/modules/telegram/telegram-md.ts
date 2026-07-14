/**
 * Мини-конвертер markdown → Telegram-HTML (#434) для шапки-пояснения дайджеста.
 *
 * Чистая функция без внешних зависимостей: поддерживает ровно то подмножество,
 * которым пишется docs/comms/ALLY_DIGEST_HEADER.md — **bold**, *italic*,
 * [текст](url), `код`. Всё остальное уходит экранированным текстом
 * (parse_mode HTML: & < > обязательны к экранированию).
 */

// NUL не встречается в md-тексте — безопасный маркер слота.
const CODE_SLOT = '\u0000';

export function mdToTelegramHtml(md: string): string {
  const codeSlots: string[] = [];
  let text = md.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  // `код` прячем в слоты до остальных преобразований — внутри кода разметка не действует.
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    codeSlots.push(`<code>${code}</code>`);
    return `${CODE_SLOT}${codeSlots.length - 1}${CODE_SLOT}`;
  });

  text = text.replace(
    /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, url: string) => `<a href="${url.replaceAll('"', '&quot;')}">${label}</a>`,
  );
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/gm, '$1<i>$2</i>');

  text = text.replace(
    new RegExp(`${CODE_SLOT}(\\d+)${CODE_SLOT}`, 'g'),
    (_m, i: string) => codeSlots[Number(i)] ?? '',
  );
  return text.trim();
}

/**
 * Свёрнутая шапка-пояснение: expandable blockquote (Bot API HTML parse mode),
 * по умолчанию читатель видит одну строку и стрелку разворота.
 */
export function renderExpandablePrimer(primerMd: string): string {
  return `<blockquote expandable>${mdToTelegramHtml(primerMd)}</blockquote>`;
}

/** Незакрытые парные теги усечённого фрагмента, в порядке закрытия. */
function unclosedTags(html: string): string[] {
  const open: string[] = [];
  for (const m of html.matchAll(/<(\/?)([a-z]+)(?:\s[^>]*)?>/g)) {
    const tag = m[2];
    if (!tag) continue;
    if (m[1]) {
      if (open[open.length - 1] === tag) open.pop();
    } else {
      open.push(tag);
    }
  }
  return open.reverse();
}

/**
 * Жёсткое усечение под лимит Telegram: без обрыва тега И с дозакрытием парных
 * тегов — parse_mode HTML отклоняет всё сообщение при незакрытом теге.
 */
export function clampTelegramHtml(html: string, limit: number): string {
  if (html.length <= limit) return html;
  let budget = limit - 1; // минус '…'
  for (;;) {
    const cut = html.slice(0, budget).replace(/<[^>]*$/, '').trimEnd();
    const closers = unclosedTags(cut)
      .map((tag) => `</${tag}>`)
      .join('');
    const result = `${cut}…${closers}`;
    if (result.length <= limit) return result;
    budget -= result.length - limit;
  }
}
