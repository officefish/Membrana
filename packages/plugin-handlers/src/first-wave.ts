/**
 * Первая волна целиком: шесть handler-манифестов дома `background-media/collections` и одна
 * функция регистрации в хосте (`IPluginHost.registerPlugin`, M2). Хост — чей угодно: пакет
 * знает только интерфейс из `plugin-contracts`, ни Nest, ни конкретного класса.
 */
import type { HandlerManifest, IPluginHost, PluginContext, PluginExecutor, RunResult } from '@membrana/plugin-contracts';
import { createMfccExecutor, type MfccExecutorDeps } from './mfcc/executor.js';
import { MFCC_HANDLER_MANIFEST } from './mfcc/manifest.js';
import { STUB_HANDLER_MANIFESTS, notImplementedExecutor } from './stubs.js';

export const FIRST_WAVE_MANIFESTS: ReadonlyArray<HandlerManifest> = [MFCC_HANDLER_MANIFEST, ...STUB_HANDLER_MANIFESTS];

export type FirstWaveResultSink = (manifest: HandlerManifest, ctx: PluginContext, result: RunResult) => void | Promise<void>;

export interface FirstWaveDeps {
  /** Всё, что нужно живому mfcc, кроме манифеста — он здесь свой. */
  readonly mfcc: Omit<MfccExecutorDeps, 'manifest'>;
  /**
   * Куда уходит результат прогона: хост (M4) результат `execute` не возвращает, а дом результатов
   * живёт в офисе — мост media → `plugin-results` подключается этим сидом (#1961), не хостом.
   */
  readonly onResult?: FirstWaveResultSink;
}

const withSink = (manifest: HandlerManifest, executor: PluginExecutor, sink: FirstWaveResultSink | undefined): PluginExecutor =>
  sink
    ? { async execute(ctx) { const result = await executor.execute(ctx); await sink(manifest, ctx, result); return result; } }
    : executor;

/** Регистрирует шесть; возвращает манифесты в порядке регистрации. Ошибка хоста не глотается. */
export function registerFirstWave(host: IPluginHost, deps: FirstWaveDeps): ReadonlyArray<HandlerManifest> {
  host.registerPlugin(MFCC_HANDLER_MANIFEST, withSink(MFCC_HANDLER_MANIFEST, createMfccExecutor({ ...deps.mfcc, manifest: MFCC_HANDLER_MANIFEST }), deps.onResult));
  // Заглушки без сида: их execute бросает до любого результата — сиду нечего нести (ревью #1975, P0-1).
  for (const manifest of STUB_HANDLER_MANIFESTS) host.registerPlugin(manifest, notImplementedExecutor(manifest));
  return FIRST_WAVE_MANIFESTS;
}
