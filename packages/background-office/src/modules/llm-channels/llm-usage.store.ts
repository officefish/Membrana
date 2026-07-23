import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import type { UsageEventDto } from './llm-channels.dto';

export const DEFAULT_USAGE_VOLUME = '/var/lib/membrana-office/llm-usage';
export const RETENTION_DAYS = 30;

function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function parseDayKey(name: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(name);
  return m?.[1] ?? null;
}

function daysAgoKey(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return dayKey(d);
}

export type DayAggregate = {
  date: string;
  count: number;
  okCount: number;
  failCount: number;
  tokensIn: number | null;
  tokensOut: number | null;
  byProcedure: Record<
    string,
    { count: number; okCount: number; failCount: number; tokensIn: number | null; tokensOut: number | null }
  >;
  byProvider: Record<
    string,
    { count: number; okCount: number; failCount: number; tokensIn: number | null; tokensOut: number | null }
  >;
  recent: UsageEventDto[];
};

function addTokens(acc: number | null, v: number | null | undefined): number | null {
  if (v == null) return acc;
  return (acc ?? 0) + v;
}

@Injectable()
export class LlmUsageStore {
  private readonly logger = new Logger(LlmUsageStore.name);
  private readonly seenIds = new Set<string>();
  private seenLoaded = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  volumeRoot(): string {
    const configured = this.config.LLM_USAGE_VOLUME_PATH?.trim();
    if (configured) return resolve(configured);
    return DEFAULT_USAGE_VOLUME;
  }

  dayPath(date: string): string {
    return join(this.volumeRoot(), `${date}.jsonl`);
  }

  private ensureSeenLoaded(): void {
    if (this.seenLoaded) return;
    this.seenLoaded = true;
    const root = this.volumeRoot();
    if (!existsSync(root)) return;
    const cutoff = daysAgoKey(RETENTION_DAYS);
    for (const name of readdirSync(root)) {
      const day = parseDayKey(name);
      if (!day || day < cutoff) continue;
      try {
        const text = readFileSync(join(root, name), 'utf8');
        for (const line of text.split(/\r?\n/)) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as { eventId?: string };
            if (ev.eventId) this.seenIds.add(ev.eventId);
          } catch {
            /* skip bad line */
          }
        }
      } catch {
        /* skip unreadable */
      }
    }
  }

  prune(now: Date = new Date()): number {
    const root = this.volumeRoot();
    if (!existsSync(root)) return 0;
    const cutoff = daysAgoKey(RETENTION_DAYS, now);
    let removed = 0;
    for (const name of readdirSync(root)) {
      const day = parseDayKey(name);
      if (!day || day >= cutoff) continue;
      try {
        unlinkSync(join(root, name));
        removed += 1;
      } catch (err) {
        this.logger.warn({ name, err }, 'llm-usage: prune failed');
      }
    }
    return removed;
  }

  /**
   * @returns {{ ok: true; duplicate: boolean }}
   */
  ingest(event: UsageEventDto): { ok: true; duplicate: boolean } {
    this.ensureSeenLoaded();
    this.prune();
    if (this.seenIds.has(event.eventId)) {
      return { ok: true, duplicate: true };
    }
    const date = event.ts.slice(0, 10) || dayKey();
    const path = this.dayPath(date);
    mkdirSync(this.volumeRoot(), { recursive: true });
    appendFileSync(path, `${JSON.stringify(event)}\n`, 'utf8');
    this.seenIds.add(event.eventId);
    return { ok: true, duplicate: false };
  }

  readDayEvents(date: string): UsageEventDto[] {
    const path = this.dayPath(date);
    if (!existsSync(path)) return [];
    const out: UsageEventDto[] = [];
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line) as UsageEventDto);
      } catch {
        /* skip */
      }
    }
    return out;
  }

  aggregateDay(date: string, recentLimit = 50): DayAggregate {
    const events = this.readDayEvents(date);
    const agg: DayAggregate = {
      date,
      count: 0,
      okCount: 0,
      failCount: 0,
      tokensIn: null,
      tokensOut: null,
      byProcedure: {},
      byProvider: {},
      recent: events.slice(-recentLimit).reverse(),
    };

    const bump = (
      map: DayAggregate['byProcedure'],
      key: string,
      ev: UsageEventDto,
    ) => {
      const cur = map[key] ?? {
        count: 0,
        okCount: 0,
        failCount: 0,
        tokensIn: null,
        tokensOut: null,
      };
      cur.count += 1;
      if (ev.ok) cur.okCount += 1;
      else cur.failCount += 1;
      cur.tokensIn = addTokens(cur.tokensIn, ev.tokensIn ?? null);
      cur.tokensOut = addTokens(cur.tokensOut, ev.tokensOut ?? null);
      map[key] = cur;
    };

    for (const ev of events) {
      agg.count += 1;
      if (ev.ok) agg.okCount += 1;
      else agg.failCount += 1;
      agg.tokensIn = addTokens(agg.tokensIn, ev.tokensIn ?? null);
      agg.tokensOut = addTokens(agg.tokensOut, ev.tokensOut ?? null);
      bump(agg.byProcedure, ev.procedureId, ev);
      bump(agg.byProvider, ev.provider, ev);
    }
    return agg;
  }
}
