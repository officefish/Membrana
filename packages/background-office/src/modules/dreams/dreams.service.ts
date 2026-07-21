import { Inject, Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { DeepSeekService } from '../deepseek/deepseek.service';
import { OpenRouterService } from '../openrouter/openrouter.service';

type DreamsLib = {
  DreamsLog: new (opts?: { path?: string }) => {
    hasSlot: (day: string, hour: number) => boolean;
    append: (e: unknown) => { ok: boolean; reason?: string; event?: unknown };
    projectDay: (day: string) => {
      day: string;
      winners: unknown[];
      heats: unknown[];
      noWinnerHeats: number[];
      winnerCount: number;
      dreams: unknown[];
    };
  };
  dayLogPath: (root: string, day: string) => string;
  commitDreamTick: (
    log: unknown,
    input: Record<string, unknown>,
  ) => Promise<{ ok: boolean; reason?: string; skipped?: boolean; event?: unknown }>;
  formatDreamDigestMd: (proj: unknown) => string;
  enumeratePairs: (registry: unknown) => Array<{ a: { id: string }; b: { id: string } }>;
  routeDreamProvider: (provider: string) => {
    channel: 'deepseek' | 'openrouter';
    model?: string;
  } | null;
  providerUnavailableResult: (
    provider: string,
    detail: string,
  ) => {
    ok: false;
    status: number;
    bodyText: string;
    error: string;
  };
};

/**
 * Office-писатель снов (M5): единственный append в volume, cron-тик, read-дайджест.
 * Чистое ядро остаётся в `scripts/lib/dreams-*.mjs` — сюда только обвязка.
 */
@Injectable()
export class DreamsService {
  private readonly logger = new Logger(DreamsService.name);
  private libPromise: Promise<DreamsLib> | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly deepseek: DeepSeekService,
    private readonly openrouter: OpenRouterService,
  ) {}

  isEnabled(): boolean {
    return this.config.DREAMS_ENABLED === true;
  }

  volumeRoot(): string {
    return resolve(this.config.DREAMS_VOLUME_PATH?.trim() || join(this.repoRoot(), '.data', 'dreams-volume'));
  }

  repoRoot(): string {
    return resolve(this.config.RAG_REPO_ROOT?.trim() || process.cwd());
  }

  private async lib(): Promise<DreamsLib> {
    if (!this.libPromise) {
      const root = this.repoRoot();
      this.libPromise = (async () => {
        const logMod = await import(pathToFileURL(join(root, 'scripts/lib/dreams-log.mjs')).href);
        const tickMod = await import(pathToFileURL(join(root, 'scripts/lib/dreams-tick.mjs')).href);
        const fmtMod = await import(pathToFileURL(join(root, 'scripts/lib/dreams-format.mjs')).href);
        const nightMod = await import(pathToFileURL(join(root, 'scripts/lib/night-research.mjs')).href);
        const providersMod = await import(
          pathToFileURL(join(root, 'scripts/lib/dreams-providers.mjs')).href
        );
        return {
          DreamsLog: logMod.DreamsLog,
          dayLogPath: logMod.dayLogPath,
          commitDreamTick: tickMod.commitDreamTick,
          formatDreamDigestMd: fmtMod.formatDreamDigestMd,
          enumeratePairs: nightMod.enumeratePairs,
          routeDreamProvider: providersMod.routeDreamProvider,
          providerUnavailableResult: providersMod.providerUnavailableResult,
        };
      })();
    }
    return this.libPromise;
  }

  private pickPairSync(
    enumeratePairs: DreamsLib['enumeratePairs'],
    day: string,
    hour: number,
  ): [string, string] | null {
    const regPath = join(this.repoRoot(), 'docs/truth/registry.json');
    if (!existsSync(regPath)) return null;
    const registry = JSON.parse(readFileSync(regPath, 'utf8')) as unknown;
    const pairs = enumeratePairs(registry);
    if (pairs.length === 0) return null;
    const seed = `${day}|h${hour}`;
    let h = 2166136261 >>> 0;
    for (const ch of seed) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    const pair = pairs[h % pairs.length];
    if (!pair?.a?.id || !pair?.b?.id) return null;
    return [pair.a.id, pair.b.id];
  }

  private promptMd(): string {
    const p = join(this.repoRoot(), 'docs/prompts/DREAM_MASTER_PROMPT.md');
    return existsSync(p) ? readFileSync(p, 'utf8') : '## DREAM_MASTER_VERSION\n\n`0.0.0-dev`\n';
  }

  /**
   * Порт синтеза для dreams-tick. Экспорт ради unit-тестов с моками каналов.
   */
  async synthesizeForProvider(
    provider: string,
    ctx: { pair: [string, string] },
    deps?: {
      routeDreamProvider?: DreamsLib['routeDreamProvider'];
      providerUnavailableResult?: DreamsLib['providerUnavailableResult'];
    },
  ): Promise<{
    ok: boolean;
    text?: string;
    score?: number;
    status?: number;
    bodyText?: string;
    error?: string;
  }> {
    const routeFn = deps?.routeDreamProvider;
    const unavailableFn = deps?.providerUnavailableResult;
    const lib =
      routeFn && unavailableFn
        ? { routeDreamProvider: routeFn, providerUnavailableResult: unavailableFn }
        : await this.lib();

    const route = lib.routeDreamProvider(provider);
    if (!route) {
      return lib.providerUnavailableResult(provider, 'unknown-provider');
    }

    const prompt =
      `Ты Мастер снов. Пара тезисов: ${ctx.pair[0]} × ${ctx.pair[1]}. ` +
      `Синтезируй короткий внешний сон (1–2 абзаца) без жаргона репозитория.`;

    if (route.channel === 'deepseek') {
      if (!this.deepseek.isConfigured()) {
        return lib.providerUnavailableResult(provider, 'DEEPSEEK_API_KEY missing');
      }
      try {
        const text = await this.deepseek.chat(prompt);
        return { ok: true, text, score: 0.55 };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg, bodyText: msg };
      }
    }

    if (!this.openrouter.isConfigured()) {
      return lib.providerUnavailableResult(provider, 'OPENROUTER_API_KEY missing');
    }
    try {
      const text = await this.openrouter.chat(prompt, 4_096, route.model);
      return { ok: true, text, score: 0.55 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const statusMatch = msg.match(/OpenRouter HTTP (\d+)/);
      const status = statusMatch ? Number(statusMatch[1]) : undefined;
      return { ok: false, status, error: msg, bodyText: msg };
    }
  }

  private async synthesize(provider: string, ctx: { pair: [string, string] }) {
    return this.synthesizeForProvider(provider, ctx);
  }

  async tick(day: string, hour: number): Promise<Record<string, unknown>> {
    if (!this.isEnabled()) {
      return { ok: true, skipped: true, reason: 'DREAMS_ENABLED off' };
    }
    const lib = await this.lib();
    const root = this.volumeRoot();
    mkdirSync(join(root, 'dreams'), { recursive: true });
    const log = new lib.DreamsLog({ path: lib.dayLogPath(root, day) });
    if (log.hasSlot(day, hour)) {
      return { ok: false, skipped: true, reason: 'slot-exists' };
    }
    const pair = this.pickPairSync(lib.enumeratePairs, day, hour);
    const result = await lib.commitDreamTick(log, {
      day,
      hour,
      pair,
      promptMd: this.promptMd(),
      synthesize: (provider: string, ctx: { pair: [string, string] }) => this.synthesize(provider, ctx),
    });
    this.logger.log({ day, hour, ok: result.ok, skipped: result.skipped }, 'dreams tick');
    return result as Record<string, unknown>;
  }

  async digest(day: string): Promise<{ projection: unknown; markdown: string }> {
    const lib = await this.lib();
    const log = new lib.DreamsLog({ path: lib.dayLogPath(this.volumeRoot(), day) });
    const projection = log.projectDay(day);
    return { projection, markdown: lib.formatDreamDigestMd(projection) };
  }

  /** Доставка к ритуалу: write docs/DREAMS_DIGEST.md (read-проекция). */
  async deliverToRitual(day: string): Promise<{ path: string; winnerCount: number }> {
    const { projection, markdown } = await this.digest(day);
    const out = join(this.repoRoot(), 'docs/DREAMS_DIGEST.md');
    writeFileSync(out, markdown, 'utf8');
    const winnerCount = (projection as { winnerCount?: number }).winnerCount ?? 0;
    return { path: out, winnerCount };
  }
}
