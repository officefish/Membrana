import type { RitualDigestDto } from './ritual-digest.dto';

/**
 * Чистые функции «вёрстки» telegram-сообщений (канон REVIEW инсайта
 * insight-telegram-work-reports): единый лаконичный формат — заголовок + булиты,
 * без эмодзи-шума, тестируемы без сети. parse_mode = HTML, поэтому экранируем
 * только & < > (Bot API HTML style).
 */
export function escapeTelegramHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** `2026-07-13` → `13.07.2026`; нераспознанное — как есть. */
export function formatDateRu(isoDate: string): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : isoDate;
}

function renderMessage(opts: {
  title: string;
  headline: string;
  scoreLine?: string;
  pointsTitle: string;
  points: string[];
  techFooter?: string;
}): string {
  const lines: string[] = [`<b>${escapeTelegramHtml(opts.title)}</b>`, ''];
  lines.push(escapeTelegramHtml(opts.headline));
  if (opts.scoreLine) {
    lines.push('', escapeTelegramHtml(opts.scoreLine));
  }
  if (opts.points.length > 0) {
    lines.push('', escapeTelegramHtml(opts.pointsTitle));
    for (const point of opts.points) {
      lines.push(`• ${escapeTelegramHtml(point)}`);
    }
  }
  if (opts.techFooter) {
    lines.push('', `<i>${escapeTelegramHtml(opts.techFooter)}</i>`);
  }
  return lines.join('\n');
}

export function formatDayDigest(digest: RitualDigestDto): string {
  return renderMessage({
    title: `Membrana — план на ${formatDateRu(digest.date)}`,
    headline: digest.headline,
    pointsTitle: 'Сегодня в работе:',
    points: digest.points,
    techFooter: digest.techFooter,
  });
}

export function formatEveningDigest(digest: RitualDigestDto): string {
  return renderMessage({
    title: `Membrana — итоги дня ${formatDateRu(digest.date)}`,
    headline: digest.headline,
    scoreLine: digest.teamScore
      ? `Команда оценивает полезность дня: ${digest.teamScore}.`
      : undefined,
    pointsTitle: 'Что дальше:',
    points: digest.points,
    techFooter: digest.techFooter,
  });
}

export function formatRitualDigest(digest: RitualDigestDto): string {
  return digest.kind === 'day' ? formatDayDigest(digest) : formatEveningDigest(digest);
}
