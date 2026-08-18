import type {
  HomeName,
  IPluginEvent,
  IPluginHost,
  PluginContext,
  PluginExecutor,
  PluginId,
  PluginManifest,
  PluginTrigger,
} from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };

export type { HomeName, IPluginEvent, IPluginHost, PluginContext, PluginExecutor, PluginId, PluginManifest, PluginTrigger };

export const COLLECTIONS_PLUGIN_HOST_ID: HomeName = 'background-media/collections';

export interface PluginRegistration {
  readonly manifest: PluginManifest;
  readonly executor: PluginExecutor;
  enabled: boolean;
}
