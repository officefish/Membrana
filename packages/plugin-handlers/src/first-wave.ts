/**
 * Первая волна целиком: шесть handler-манифестов дома `background-media/collections` и одна
 * функция регистрации в хосте (`IPluginHost.registerPlugin`, M2). Хост — чей угодно: пакет
 * знает только интерфейс из `plugin-contracts`, ни Nest, ни конкретного класса.
 */
import type { HandlerManifest, IPluginHost } from '@membrana/plugin-contracts';
import { createMfccExecutor, type MfccExecutorDeps } from './mfcc/executor.js';
import { MFCC_HANDLER_MANIFEST } from './mfcc/manifest.js';
import { STUB_HANDLER_MANIFESTS, notImplementedExecutor } from './stubs.js';

export const FIRST_WAVE_MANIFESTS: ReadonlyArray<HandlerManifest> = [MFCC_HANDLER_MANIFEST, ...STUB_HANDLER_MANIFESTS];

export interface FirstWaveDeps {
  /** Всё, что нужно живому mfcc, кроме манифеста — он здесь свой. */
  readonly mfcc: Omit<MfccExecutorDeps, 'manifest'>;
}

/** Регистрирует шесть; возвращает манифесты в порядке регистрации. Ошибка хоста не глотается. */
export function registerFirstWave(host: IPluginHost, deps: FirstWaveDeps): ReadonlyArray<HandlerManifest> {
  host.registerPlugin(MFCC_HANDLER_MANIFEST, createMfccExecutor({ ...deps.mfcc, manifest: MFCC_HANDLER_MANIFEST }));
  for (const manifest of STUB_HANDLER_MANIFESTS) host.registerPlugin(manifest, notImplementedExecutor(manifest));
  return FIRST_WAVE_MANIFESTS;
}
