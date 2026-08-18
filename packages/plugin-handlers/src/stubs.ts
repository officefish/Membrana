/**
 * Остальные пять детекторов первой волны (M6′, PR-4): манифест — настоящий, executor — заглушка,
 * которая НЕ молчит. Тихий no-op выглядел бы снаружи как «прогон прошёл, ничего не найдено»,
 * то есть подменял бы измеренное сервером (норма #1950 в её честной форме). Поэтому — именованный
 * отказ броском: `RunResult.kind` по M1 равен роду плагина, отдельного `'not-implemented'` в
 * словаре нет, и выдумывать его здесь значило бы переоткрыть M1.
 */
import type { HandlerManifest, PluginContext, PluginExecutor, PluginId, PluginTrigger } from '@membrana/plugin-contracts';
import { firstWaveHandlerManifest } from './manifest.js';

export class PluginNotImplementedError extends Error {
  override readonly name = 'PluginNotImplementedError';
  constructor(
    readonly pluginId: PluginId,
    readonly trigger: PluginTrigger,
  ) {
    super(`${pluginId}: executor не реализован — первая волна сдаёт манифест и заглушку (M6′); повод ${trigger}`);
  }
}

export function notImplementedExecutor(manifest: HandlerManifest): PluginExecutor {
  return {
    async execute(ctx: PluginContext): Promise<never> {
      throw new PluginNotImplementedError(manifest.id, ctx.trigger);
    },
  };
}

/** Порядок — как в Т3.5 шторма; slug — имя пакета детектора без суффикса `-detector-service`. */
export const STUB_HANDLER_SLUGS = ['harmonic', 'cepstral', 'spectral-flux', 'template-match', 'yamnet'] as const;

export const STUB_HANDLER_MANIFESTS: ReadonlyArray<HandlerManifest> = STUB_HANDLER_SLUGS.map((slug) =>
  firstWaveHandlerManifest(slug, '0.1.0'),
);
