const UNITS = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'] as const;

export function formatBytes(value: string | number | bigint): string {
  let bytes = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 Б';

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const scaled = bytes / 1024 ** unitIndex;
  const digits = scaled >= 10 || unitIndex === 0 ? 0 : 1;
  return `${scaled.toFixed(digits)} ${UNITS[unitIndex]}`;
}
