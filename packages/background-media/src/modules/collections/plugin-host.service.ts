import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  COLLECTIONS_PLUGIN_HOST_ID,
  type IPluginEvent,
  type IPluginHost,
  type PluginContext,
  type PluginExecutor,
  type PluginId,
  type PluginManifest,
  type PluginRegistration,
  type PluginTrigger,
} from './plugin-host.types';

type PluginContracts = {
  readonly HOME_REGISTRY: Readonly<Record<string, unknown>>;
  isPluginId(value: unknown): boolean;
};
let pluginContractsPromise: Promise<PluginContracts> | null = null;

function pluginContracts(): Promise<PluginContracts> {
  pluginContractsPromise ??= import('@membrana/plugin-contracts').catch((error: unknown) => {
    pluginContractsPromise = null;
    throw error;
  });
  return pluginContractsPromise;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPluginContext(value: unknown): value is PluginContext {
  if (!isRecord(value) || !isRecord(value.address) || !isRecord(value.fingerprints)) return false;
  const { address, fingerprints } = value;
  return (
    typeof address.pluginId === 'string' &&
    typeof address.version === 'string' &&
    typeof address.collectionId === 'string' &&
    typeof address.runId === 'string' &&
    typeof address.mountTarget === 'string' &&
    typeof fingerprints.inputHash === 'string' &&
    typeof fingerprints.configHash === 'string' &&
    (value.resumeMode === 'fresh' || value.resumeMode === 'from-freeze') &&
    typeof value.trigger === 'string' &&
    'payload' in value
  );
}

@Injectable()
export class CollectionsPluginHostService implements IPluginHost {
  readonly mountTargetId = COLLECTIONS_PLUGIN_HOST_ID;
  private readonly logger = new Logger(CollectionsPluginHostService.name);
  private readonly plugins = new Map<PluginId, PluginRegistration>();

  async registerPlugin(manifest: PluginManifest, executor: PluginExecutor): Promise<void> {
    const { HOME_REGISTRY, isPluginId } = await pluginContracts();
    if (!isPluginId(manifest.id)) throw new BadRequestException('Invalid plugin id');
    if (!Object.hasOwn(HOME_REGISTRY, manifest.mountTarget)) {
      throw new BadRequestException(`Unknown plugin mountTarget: ${manifest.mountTarget}`);
    }
    if (manifest.mountTarget !== this.mountTargetId) {
      throw new BadRequestException(`Plugin ${manifest.id} cannot mount on ${this.mountTargetId}`);
    }
    this.plugins.set(manifest.id, { manifest, executor, enabled: true });
  }

  getRegisteredPlugins(): ReadonlyArray<PluginManifest> {
    return [...this.plugins.values()].map(({ manifest }) => manifest);
  }

  setPluginEnabled(pluginId: PluginId, enabled: boolean): void {
    const entry = this.plugins.get(pluginId);
    if (!entry) throw new NotFoundException(`Plugin ${pluginId} is not registered`);
    entry.enabled = enabled;
  }

  notify(event: IPluginEvent): void {
    if (!isPluginContext(event.payload)) throw new BadRequestException('Invalid plugin context');
    for (const entry of this.plugins.values()) {
      if (!entry.enabled || !entry.manifest.triggers.includes(event.trigger)) continue;
      const ctx = { ...event.payload, trigger: event.trigger };
      void entry.executor
        .execute(ctx)
        .catch((error: unknown) => this.logger.error({ error, pluginId: entry.manifest.id }, 'Plugin notify failed'));
    }
  }

  async request(pluginId: PluginId, trigger: PluginTrigger, ctx: PluginContext): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) throw new NotFoundException(`Plugin ${pluginId} is not registered`);
    if (!entry.enabled) throw new BadRequestException(`Plugin ${pluginId} is disabled`);
    await entry.executor.execute({ ...ctx, trigger });
  }
}
