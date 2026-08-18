export const COLLECTIONS_PLUGIN_HOST_ID = 'background-media/collections';
// TODO(#1961): replace this local first-wave mirror with @membrana/plugin-contracts
// before adding the second host.
export const HOME_REGISTRY = [COLLECTIONS_PLUGIN_HOST_ID] as const;

export type PluginId = string & { readonly __brand: 'PluginId' };
export type MountTargetId = (typeof HOME_REGISTRY)[number];
export type PluginKind = 'handler' | 'report' | 'showcase';

interface BasePluginManifest {
  id: PluginId;
  version: string;
  mountTarget: string;
  triggers: string[];
}

export interface HandlerManifest extends BasePluginManifest {
  kind: 'handler';
}

export interface ReportManifest extends BasePluginManifest {
  kind: 'report';
}

export interface ShowcaseManifest extends BasePluginManifest {
  kind: 'showcase';
}

export type PluginManifest = HandlerManifest | ReportManifest | ShowcaseManifest;

export interface PluginRuntime {
  manifest: PluginManifest;
  handle(trigger: string, ctx: unknown): unknown | Promise<unknown>;
}

export interface PluginRegistration {
  manifest: PluginManifest;
  enabled: boolean;
}

export interface PluginHostEvent {
  trigger: string;
  ctx: unknown;
}

export interface IPluginHost {
  readonly mountTargetId: MountTargetId;
  registerPlugin(plugin: PluginRuntime): void;
  getRegisteredPlugins(): PluginRegistration[];
  setPluginEnabled(pluginId: PluginId, enabled: boolean): void;
  notify(event: PluginHostEvent): Promise<void>;
  request(pluginId: PluginId, trigger: string, ctx: unknown): Promise<unknown>;
}

const PLUGIN_ID_RE = /^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/;

export function isPluginId(value: unknown): value is PluginId {
  return typeof value === 'string' && PLUGIN_ID_RE.test(value);
}

export function isKnownMountTarget(value: string): value is MountTargetId {
  return (HOME_REGISTRY as readonly string[]).includes(value);
}
