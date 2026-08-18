import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  COLLECTIONS_PLUGIN_HOST_ID,
  type IPluginHost,
  type PluginHostEvent,
  type PluginId,
  type PluginRegistration,
  type PluginRuntime,
  isKnownMountTarget,
  isPluginId,
} from './plugin-host.types';

@Injectable()
export class CollectionsPluginHostService implements IPluginHost {
  readonly mountTargetId = COLLECTIONS_PLUGIN_HOST_ID;
  private readonly plugins = new Map<PluginId, PluginRegistration & { runtime: PluginRuntime }>();

  registerPlugin(plugin: PluginRuntime): void {
    const { manifest } = plugin;
    if (!isPluginId(manifest.id)) throw new BadRequestException('Invalid plugin id');
    if (!isKnownMountTarget(manifest.mountTarget)) {
      throw new BadRequestException(`Unknown plugin mountTarget: ${manifest.mountTarget}`);
    }
    if (manifest.mountTarget !== this.mountTargetId) {
      throw new BadRequestException(`Plugin ${manifest.id} cannot mount on ${this.mountTargetId}`);
    }
    this.plugins.set(manifest.id, { manifest: { ...manifest }, enabled: true, runtime: plugin });
  }

  getRegisteredPlugins(): PluginRegistration[] {
    return [...this.plugins.values()].map(({ manifest, enabled }) => ({ manifest: { ...manifest }, enabled }));
  }

  setPluginEnabled(pluginId: PluginId, enabled: boolean): void {
    const entry = this.plugins.get(pluginId);
    if (!entry) throw new NotFoundException(`Plugin ${pluginId} is not registered`);
    entry.enabled = enabled;
  }

  async notify(event: PluginHostEvent): Promise<void> {
    await Promise.all(
      [...this.plugins.values()]
        .filter((entry) => entry.enabled && entry.manifest.triggers.includes(event.trigger))
        .map((entry) => entry.runtime.handle(event.trigger, event.ctx)),
    );
  }

  async request(pluginId: PluginId, trigger: string, ctx: unknown): Promise<unknown> {
    const entry = this.plugins.get(pluginId);
    if (!entry) throw new NotFoundException(`Plugin ${pluginId} is not registered`);
    if (!entry.enabled) throw new BadRequestException(`Plugin ${pluginId} is disabled`);
    return entry.runtime.handle(trigger, ctx);
  }
}
