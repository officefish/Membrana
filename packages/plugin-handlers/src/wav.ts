/**
 * WAV PCM16 → моно — теперь из `@membrana/wav-decode` (#1972: третья копия декодера снята 19.08).
 * Имя в публичном контракте пакета сохранено реэкспортом: потребители `decodeWavMono16` не меняются.
 */
export { decodeWavMono16, type DecodedMono, type WavDecodeResult } from '@membrana/wav-decode';
