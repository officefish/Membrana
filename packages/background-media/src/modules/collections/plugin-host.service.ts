import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

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
  pluginContractsPromise ??= import('@membrana/plugin-contracts');
  return pluginContractsPromise;
}

@Injectable()
export class CollectionsPluginHostService implements IPluginHost {
  readonly mountTargetId = COLLECTIONS_PLUGIN_HOST_ID;
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
    for (const entry of this.plugins.values()) {
      if (!entry.enabled || !entry.manifest.triggers.includes(event.trigger)) continue;
      const ctx = { ...(event.payload as PluginContext), trigger: event.trigger };
      void entry.executor.execute(ctx);
    }
  }

  async request(pluginId: PluginId, trigger: PluginTrigger, ctx: PluginContext): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) throw new NotFoundException(`Plugin ${pluginId} is not registered`);
    if (!entry.enabled) throw new BadRequestException(`Plugin ${pluginId} is disabled`);
    await entry.executor.execute({ ...ctx, trigger });
  }
}
