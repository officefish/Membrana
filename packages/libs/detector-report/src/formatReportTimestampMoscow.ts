const MOSCOW_TIME_ZONE = 'Europe/Moscow';

const moscowDateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MOSCOW_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/**
 * Human-readable report timestamp in Moscow time (МСК).
 * Example: «15.06.2026, 16:42:03 МСК».
 */
export function formatReportTimestampMoscow(date: Date): string {
  const formatted = moscowDateTimeFormatter.format(date);
  return `${formatted} МСК`;
}
