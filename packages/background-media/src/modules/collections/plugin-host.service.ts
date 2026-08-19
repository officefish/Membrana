import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';

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

export type PluginContracts = {
  readonly HOME_REGISTRY: Readonly<Record<string, unknown>>;
  isPluginId(value: unknown): boolean;
};

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
export class CollectionsPluginHostService implements IPluginHost, OnModuleInit {
  readonly mountTargetId = COLLECTIONS_PLUGIN_HOST_ID;
  private readonly logger = new Logger(CollectionsPluginHostService.name);
  private readonly plugins = new Map<PluginId, PluginRegistration>();
  private contracts: PluginContracts | null = null;
  /**
   * Обещание импорта — ПОЛЕ ЭКЗЕМПЛЯРА, не модульный `let` (фидбек Ожегова 18.08, спринт
   * contour-sanity #1972): два экземпляра (тест + рантайм, два модуля) не делят состояние, и
   * ошибка импорта у одного не залипает у другого. Ошибка сбрасывает кеш — повтор возможен.
   */
  private contractsPromise: Promise<PluginContracts> | null = null;

  /** Шов загрузки контрактов: тест подменяет наследником, рантайм — динамический импорт ESM-пакета. */
  protected loadContracts(): Promise<PluginContracts> {
    return import('@membrana/plugin-contracts');
  }

  private pluginContracts(): Promise<PluginContracts> {
    this.contractsPromise ??= this.loadContracts().catch((error: unknown) => {
      this.contractsPromise = null;
      throw error;
    });
    return this.contractsPromise;
  }

  async onModuleInit(): Promise<void> {
    this.contracts = await this.pluginContracts();
  }

  registerPlugin(manifest: PluginManifest, executor: PluginExecutor): void {
    if (!this.contracts) throw new ServiceUnavailableException('Plugin host is not initialized');
    const { HOME_REGISTRY, isPluginId } = this.contracts;
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
