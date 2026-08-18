/**
 * Пресет ворот тембрового детектора (`data/detectors-benchmark/v0.2/reports/mfcc-gates-first-cut.json`,
 * ключ `preset`) → спека судьи `PipeSpec`. Разворот повторяет измеритель (`scripts/lib/mfcc-benchmark.mjs`)
 * и прибор (`specOf` в `mfccAnalyzerPlugin.ts`) — плагин обязан судить ТЕМ ЖЕ способом, иначе он
 * не «mfcc-детектор на сервере», а третий детектор. Пороги не трогаются: сегодня — про подключение.
 */
import type { PipeSpec, MfccConfig } from '@membrana/mfcc-analyzer-service';

export type MfccStrictness = 'easy' | 'normal' | 'strict';

export interface MfccGatePreset {
  /** `mel<N>-c<K>-buf<B>-sr<R>` — частота обязательна: банк мел-фильтров строится от неё. */
  readonly configHash: string;
  readonly bounds: ReadonlyArray<{ readonly min: number; readonly max: number }>;
  readonly judgedCoefficients: readonly number[];
  readonly minMagnitude: number;
  readonly strictness: Readonly<
    Record<MfccStrictness, { readonly minInBandRatio: number; readonly minPassRate: number }>
  >;
}

export interface MfccRuntimeConfig extends MfccConfig {
  readonly sampleRate: number;
}

const HASH_RE = /^mel(\d+)-c(\d+)-buf(\d+)-sr(\d+)$/u;

export function mfccConfigFromHash(configHash: string): MfccRuntimeConfig | null {
  const m = HASH_RE.exec(configHash);
  if (!m) return null;
  return {
    melBands: Number(m[1]),
    numberOfCoefficients: Number(m[2]),
    bufferSize: Number(m[3]),
    sampleRate: Number(m[4]),
  };
}

/** Спека судьи из пресета; отказ — броском с причиной, молчаливого умолчания нет. */
export function mfccPipeSpecOf(preset: MfccGatePreset, strictness: MfccStrictness): PipeSpec {
  const config = mfccConfigFromHash(preset.configHash);
  if (config === null) {
    throw new Error(`отпечаток пресета «${preset.configHash}» не разбирается (нужен -sr)`);
  }
  if (preset.bounds.length !== config.numberOfCoefficients) {
    throw new Error(
      `коридоров ${preset.bounds.length} ≠ коэффициентов ${config.numberOfCoefficients} по отпечатку`,
    );
  }
  const pair = preset.strictness[strictness];
  if (!pair) throw new Error(`уровень строгости «${strictness}» отсутствует в пресете`);
  return {
    bounds: preset.bounds,
    configHash: preset.configHash,
    minInBandRatio: pair.minInBandRatio,
    minPassRate: pair.minPassRate,
    minMagnitude: preset.minMagnitude,
    judgedCoefficients: preset.judgedCoefficients,
  };
}
