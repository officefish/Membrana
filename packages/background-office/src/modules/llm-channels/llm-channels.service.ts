import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import type { ChainConfigDto } from './llm-channels.dto';
import { LlmProcedureOverlayStore } from './llm-procedure-overlay.store';
import { LlmUsageStore, type DayAggregate } from './llm-usage.store';
import type { UsageEventDto } from './llm-channels.dto';

type ProcedureRecord = {
  id: string;
  entryMjs: string;
  yarnScript?: string;
  title?: string;
  meters: boolean;
  group?: string;
};

type EffectiveProcedure = {
  procedureId: string;
  chain: Array<{ provider: string; model: string }>;
  source: 'overlay' | 'default';
  meters: boolean;
  entryMjs?: string;
  title?: string;
  yarnScript?: string;
  group?: string;
};

@Injectable()
export class LlmChannelsService {
  private readonly logger = new Logger(LlmChannelsService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly overlay: LlmProcedureOverlayStore,
    private readonly usage: LlmUsageStore,
  ) {}

  repoRoot(): string {
    return resolve(this.config.RAG_REPO_ROOT?.trim() || process.cwd());
  }

  private readJsonFile<T>(rel: string): T | null {
    const path = join(this.repoRoot(), rel);
    if (!existsSync(path)) {
      this.logger.warn({ path }, 'llm-channels: git defaults missing');
      return null;
    }
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as T;
    } catch (err) {
      this.logger.error({ path, err }, 'llm-channels: cannot parse git defaults');
      return null;
    }
  }

  loadRegistry(): ProcedureRecord[] {
    const reg = this.readJsonFile<{ procedures: ProcedureRecord[] }>(
      'scripts/lib/llm-procedures.json',
    );
    return reg?.procedures ?? [];
  }

  loadDefaults(): Record<string, ChainConfigDto> {
    return (
      this.readJsonFile<Record<string, ChainConfigDto>>(
        'scripts/lib/llm-procedure-defaults.json',
      ) ?? {}
    );
  }

  /**
   * Public catalog for panel: providers × curated models (no secrets).
   * Model id is chosen independently of provider for each chain step.
   */
  loadProviderCatalogPublic(): {
    ritualEnum: string[];
    providers: Array<{
      id: string;
      title: string;
      defaultModel: string;
      models: Array<{ id: string; label: string }>;
    }>;
  } {
    const raw = this.readJsonFile<{
      ritualEnum?: string[];
      providers?: Record<
        string,
        {
          title?: string;
          defaultModel?: string;
          suggestedModel?: string;
          models?: Array<{ id?: string; label?: string }>;
        }
      >;
    }>('scripts/lib/llm-provider-catalog.json');
    const ritualEnum = Array.isArray(raw?.ritualEnum) ? raw.ritualEnum.filter((x) => typeof x === 'string') : [];
    const providers = ritualEnum
      .map((id) => {
        const p = raw?.providers?.[id];
        if (!p) return null;
        const models = Array.isArray(p.models)
          ? p.models
              .filter((m) => typeof m?.id === 'string' && m.id.trim() && typeof m?.label === 'string')
              .map((m) => ({ id: String(m.id).trim(), label: String(m.label).trim() }))
          : [];
        const defaultModel =
          (typeof p.defaultModel === 'string' && p.defaultModel.trim()) ||
          (typeof p.suggestedModel === 'string' && p.suggestedModel.trim()) ||
          models[0]?.id ||
          '';
        return {
          id,
          title: (typeof p.title === 'string' && p.title.trim()) || id,
          defaultModel,
          models,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    return { ritualEnum, providers };
  }

  getOverlaySnapshot() {
    return this.overlay.snapshot();
  }

  putOverlay(procedureId: string, cfg: ChainConfigDto) {
    if (this.overlay.isDegraded()) {
      throw new ServiceUnavailableException('llm-overlay store degraded');
    }
    const ids = new Set(this.loadRegistry().map((p) => p.id));
    if (!ids.has(procedureId)) {
      throw new NotFoundException(`unknown procedureId «${procedureId}»`);
    }
    const next = this.overlay.put(procedureId, cfg);
    if (!next) throw new ServiceUnavailableException('llm-overlay write failed');
    return next.procedures[procedureId];
  }

  deleteOverlay(procedureId: string) {
    if (this.overlay.isDegraded()) {
      throw new ServiceUnavailableException('llm-overlay store degraded');
    }
    const next = this.overlay.delete(procedureId);
    if (!next) throw new ServiceUnavailableException('llm-overlay write failed');
    return { ok: true as const, procedureId };
  }

  resolveEffective(procedureId: string): EffectiveProcedure {
    const record = this.loadRegistry().find((p) => p.id === procedureId);
    if (!record) {
      throw new NotFoundException(`unknown procedureId «${procedureId}»`);
    }
    const fromOverlay = this.overlay.get(procedureId);
    const defaults = this.loadDefaults();
    let cfg: ChainConfigDto | undefined;
    let source: 'overlay' | 'default';
    if (fromOverlay?.chain?.length) {
      cfg = fromOverlay;
      source = 'overlay';
    } else {
      cfg = defaults[procedureId];
      source = 'default';
    }
    if (!cfg?.chain?.length) {
      throw new NotFoundException(`no chain for «${procedureId}»`);
    }
    return {
      procedureId,
      chain: cfg.chain.map((s) => ({ provider: s.provider, model: s.model })),
      source,
      meters: Boolean(record.meters),
      entryMjs: record.entryMjs,
      title: record.title,
      yarnScript: record.yarnScript,
      group: record.group,
    };
  }

  listEffective(): EffectiveProcedure[] {
    return this.loadRegistry().map((p) => this.resolveEffective(p.id));
  }

  ingestUsage(event: UsageEventDto) {
    return this.usage.ingest(event);
  }

  dayUsage(date: string): DayAggregate {
    return this.usage.aggregateDay(date);
  }
}
