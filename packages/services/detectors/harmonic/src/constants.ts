/** Параметры v0.1 — см. docs/discussions/dsp-drone-detector-v0.1.md */
export const DEFAULT_FFT_SIZE = 2048;
export const DEFAULT_SAMPLE_RATE = 48_000;
export const DEFAULT_HOP_RATIO = 0.5;

/** Несущая мультиротора, Гц (WHITE_PAPER §5.1). */
export const FUNDAMENTAL_MIN_HZ = 80;
export const FUNDAMENTAL_MAX_HZ = 250;

/** Верхняя граница гармоник для поиска, Гц. */
export const HARMONIC_MAX_HZ = 5_000;

/** Порог confidence для isDrone (калибровка в тестах). */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.55;
