/** Индекс бина БПФ для частоты (центр бина). */
export function hzToBin(hz: number, sampleRate: number, fftSize: number): number {
  return Math.round((hz * fftSize) / sampleRate);
}

/** Частота центра бина, Гц. */
export function binToHz(bin: number, sampleRate: number, fftSize: number): number {
  return (bin * sampleRate) / fftSize;
}
