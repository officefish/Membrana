/**
 * `runId` — UUID v7 (M3′: монотонен по времени, сортируем), общий помощник первой волны.
 *
 * Перенос из `scripts/plugin-run-mfcc.mjs` (b4 спринта `plugin-results-bridge`, #1961): вход
 * `request` в media рождает адрес прогона тем же способом, что лабораторный скрипт, — один
 * носитель формы, а не две копии. Время и случайность — параметры: зубы детерминированы,
 * часов и `Math.random` в ядре нет.
 *
 * Монотонность — по миллисекундам (48 бит времени старшими байтами); внутри одной миллисекунды
 * порядок не обещается — это и есть контракт v7 без счётчика, и он назван здесь, а не подразумевается.
 */
export type RandomBytes = (size: number) => Uint8Array;

const defaultRandom: RandomBytes = (size) => globalThis.crypto.getRandomValues(new Uint8Array(size));

export function uuidV7(now: number = Date.now(), random: RandomBytes = defaultRandom): string {
  if (!Number.isInteger(now) || now < 0 || now > 0xffff_ffff_ffff) throw new Error(`uuidV7: время ${String(now)} вне 48 бит`);
  const b = random(16);
  if (!(b instanceof Uint8Array) || b.length !== 16) throw new Error('uuidV7: источник случайности обязан отдать 16 байт');
  // 48 бит миллисекунд старшими байтами — big-endian, без BigInt ради простоты.
  const hi = Math.floor(now / 0x1_0000_0000);
  const lo = now % 0x1_0000_0000;
  b[0] = (hi >>> 8) & 0xff;
  b[1] = hi & 0xff;
  b[2] = (lo >>> 24) & 0xff;
  b[3] = (lo >>> 16) & 0xff;
  b[4] = (lo >>> 8) & 0xff;
  b[5] = lo & 0xff;
  b[6] = (b[6]! & 0x0f) | 0x70; // версия 7
  b[8] = (b[8]! & 0x3f) | 0x80; // вариант RFC 4122
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
