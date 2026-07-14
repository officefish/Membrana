import type { AllyMessageDto } from './ally-message.dto';
import type { RitualDigestDto } from './ritual-digest.dto';
import { clampTelegramHtml, mdToTelegramHtml, renderExpandablePrimer } from './telegram-md';

/**
 * Чистые функции «вёрстки» telegram-сообщений (канон REVIEW инсайта
 * insight-telegram-work-reports): единый лаконичный формат — заголовок + булиты,
 * без эмодзи-шума, тестируемы без сети. parse_mode = HTML, поэтому экранируем
 * только & < > (Bot API HTML style).
 *
 * v2 (#434): свёрнутая шапка-пояснение (<blockquote expandable>, источник —
 * docs/comms/ALLY_DIGEST_HEADER.md через payload.primerMd), секция «Треки дня»
 * вечером и детерминированный клэмп под лимит Telegram 4096.
 */
export const TELEGRAM_MESSAGE_LIMIT = 4096;

export function escapeTelegramHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** `2026-07-13` → `13.07.2026`; нераспознанное — как есть. */
export function formatDateRu(isoDate: string): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : isoDate;
}

interface MessageSection {
  title: string;
  items: string[];
}

interface MessageParts {
  title: string;
  primerMd?: string;
  headline: string;
  scoreLine?: string;
  sections: MessageSection[];
  techFooter?: string;
}

function render(parts: MessageParts, withPrimer: boolean): string {
  const lines: string[] = [`<b>${escapeTelegramHtml(parts.title)}</b>`, ''];
  if (withPrimer && parts.primerMd) {
    lines.push(renderExpandablePrimer(parts.primerMd), '');
  }
  lines.push(escapeTelegramHtml(parts.headline));
  if (parts.scoreLine) {
    lines.push('', escapeTelegramHtml(parts.scoreLine));
  }
  for (const section of parts.sections) {
    if (section.items.length === 0) continue;
    lines.push('', escapeTelegramHtml(section.title));
    for (const item of section.items) {
      lines.push(`• ${escapeTelegramHtml(item)}`);
    }
  }
  if (parts.techFooter) {
    lines.push('', `<i>${escapeTelegramHtml(parts.techFooter)}</i>`);
  }
  return lines.join('\n');
}

/**
 * Детерминированный клэмп под лимит Telegram: сначала снимаем булиты с хвоста
 * (последняя секция — первой), затем шапку-пояснение, в самом конце — жёсткое
 * усечение без обрыва HTML-тега.
 */
function renderClamped(parts: MessageParts): string {
  const sections = parts.sections.map((s) => ({ ...s, items: [...s.items] }));
  let withPrimer = true;
  for (;;) {
    const text = render({ ...parts, sections }, withPrimer);
    if (text.length <= TELEGRAM_MESSAGE_LIMIT) return text;
    const last = [...sections].reverse().find((s) => s.items.length > 0);
    if (last) {
      last.items.pop();
      continue;
    }
    if (withPrimer && parts.primerMd) {
      withPrimer = false;
      continue;
    }
    return clampTelegramHtml(text, TELEGRAM_MESSAGE_LIMIT);
  }
}

/**
 * «Ласточка»: разовое свободное сообщение союзникам по команде владельца.
 * Текст — md-подмножество конвертера; никакой обвязки заголовком/секциями.
 */
export function formatAllyMessage(message: AllyMessageDto): string {
  return clampTelegramHtml(mdToTelegramHtml(message.text), TELEGRAM_MESSAGE_LIMIT);
}

export function formatDayDigest(digest: RitualDigestDto): string {
  return renderClamped({
    title: `Membrana — план на ${formatDateRu(digest.date)}`,
    primerMd: digest.primerMd,
    headline: digest.headline,
    sections: [{ title: 'Сегодня в работе:', items: digest.points }],
    techFooter: digest.techFooter,
  });
}

export function formatEveningDigest(digest: RitualDigestDto): string {
  return renderClamped({
    title: `Membrana — итоги дня ${formatDateRu(digest.date)}`,
    primerMd: digest.primerMd,
    headline: digest.headline,
    scoreLine: digest.teamScore
      ? `Команда оценивает полезность дня: ${digest.teamScore}.`
      : undefined,
    sections: [
      { title: 'Треки дня:', items: digest.tracks ?? [] },
      { title: 'Что дальше:', items: digest.points },
    ],
    techFooter: digest.techFooter,
  });
}

export function formatRitualDigest(digest: RitualDigestDto): string {
  return digest.kind === 'day' ? formatDayDigest(digest) : formatEveningDigest(digest);
}
