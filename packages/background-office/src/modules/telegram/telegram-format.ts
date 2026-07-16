import type { AllyMessageDto } from './ally-message.dto';
import type { RitualDigestDto } from './ritual-digest.dto';
import { clampTelegramHtml, mdToTelegramHtml, renderExpandablePrimer } from './telegram-md';

/**
 * Чистые функции «вёрстки» telegram-сообщений (канон REVIEW инсайта
 * insight-telegram-work-reports). parse_mode = HTML, поэтому экранируем
 * только & < > (Bot API HTML style).
 *
 * v3 (ALLY_DIGEST_FORMAT.md): тезисная фиксированная структура —
 *   день:  центральная задача → высокий приоритет → перспективы → критерий вечера;
 *   вечер: вердикт → сошлось / не сошлось / неожиданно → оценка.
 * Детали уходят вложенным файлом (см. TelegramClient.sendDocument), не текстом.
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
  /** Метка-заголовок над headline, например «🎯 Центральная задача дня:». */
  leadLabel?: string;
  headline: string;
  sections: MessageSection[];
  scoreLine?: string;
  /** Хвостовая метка + текст, например «🌙 Критерий вечера:» + фраза. */
  footerLabel?: string;
  footerText?: string;
}

function render(parts: MessageParts, withPrimer: boolean): string {
  const lines: string[] = [`<b>${escapeTelegramHtml(parts.title)}</b>`, ''];
  if (withPrimer && parts.primerMd) {
    lines.push(renderExpandablePrimer(parts.primerMd), '');
  }
  if (parts.leadLabel) {
    lines.push(`<b>${escapeTelegramHtml(parts.leadLabel)}</b>`);
  }
  lines.push(escapeTelegramHtml(parts.headline));
  for (const section of parts.sections) {
    if (section.items.length === 0) continue;
    lines.push('', `<b>${escapeTelegramHtml(section.title)}</b>`);
    for (const item of section.items) {
      lines.push(`• ${escapeTelegramHtml(item)}`);
    }
  }
  if (parts.scoreLine) {
    lines.push('', escapeTelegramHtml(parts.scoreLine));
  }
  if (parts.footerLabel && parts.footerText) {
    lines.push('', `<b>${escapeTelegramHtml(parts.footerLabel)}</b>`, escapeTelegramHtml(parts.footerText));
  }
  return lines.join('\n');
}

/**
 * Детерминированный клэмп под лимит Telegram: сначала снимаем булиты с хвоста
 * (последняя секция — первой), затем шапку-пояснение, в самом конце — жёсткое
 * усечение без обрыва HTML-тега. Тезисный формат + вынос деталей в файл делают
 * срабатывание клэмпа редким.
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
    leadLabel: '🎯 Центральная задача дня:',
    headline: digest.headline,
    sections: [
      { title: '⬆️ Высокий приоритет:', items: digest.highPriority ?? [] },
      { title: '🔭 Перспективные направления:', items: digest.perspective ?? [] },
    ],
    ...(digest.eveningCriterion
      ? { footerLabel: '🌙 Критерий вечера:', footerText: digest.eveningCriterion }
      : {}),
  });
}

export function formatEveningDigest(digest: RitualDigestDto): string {
  return renderClamped({
    title: `Membrana — итоги дня ${formatDateRu(digest.date)}`,
    primerMd: digest.primerMd,
    headline: digest.headline,
    sections: [
      { title: '✅ Сошлось:', items: digest.converged ?? [] },
      { title: '⚠️ Не сошлось / перенесено:', items: digest.notConverged ?? [] },
      { title: '🎲 Неожиданно всплыло:', items: digest.unexpected ?? [] },
    ],
    scoreLine: digest.teamScore
      ? `Команда оценивает полезность дня: ${digest.teamScore}.`
      : undefined,
  });
}

export function formatRitualDigest(digest: RitualDigestDto): string {
  return digest.kind === 'day' ? formatDayDigest(digest) : formatEveningDigest(digest);
}
