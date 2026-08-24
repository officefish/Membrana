import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ingestWindowGauge } from './ingest-window.gauge';
import {
  DEFAULT_HEALTH_DEEP_THRESHOLDS,
  type HealthDeepNumbers,
  type HealthDeepThresholds,
} from './health-deep.decide';

/**
 * Сборщик предметных чисел `/health/deep` (кусок D #2121, вердикт M2).
 *
 * Цена вызова — прибор не должен сам становиться нагрузкой (урок 23.08: чтение
 * душило базу): длина ленты — TTL-кэш 30 с; проба базы — `SELECT 1` с budget;
 * доля доехавших — in-memory датчик пути записи. Никаких тяжёлых SQL/склеек на
 * request-path.
 */
export type HealthDeepSnapshot = {
  numbers: HealthDeepNumbers;
  /** Проба базы не уложилась в budget → род «не дойти» (unreachable). */
  dbTimedOut: boolean;
  arrivedInWindow: number;
  measuredAt: string;
};

const TAPE_TTL_MS = 30_000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw === undefined ? Number.NaN : Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadHealthDeepThresholds(): HealthDeepThresholds {
  const d = DEFAULT_HEALTH_DEEP_THRESHOLDS;
  return {
    tapeWarn: envInt('HEALTH_DEEP_TAPE_WARN', d.tapeWarn),
    tapeFail: envInt('HEALTH_DEEP_TAPE_FAIL', d.tapeFail),
    dbWarnMs: envInt('HEALTH_DEEP_DB_WARN_MS', d.dbWarnMs),
    dbFailMs: envInt('HEALTH_DEEP_DB_FAIL_MS', d.dbFailMs),
    ratioWarn: envFloat('HEALTH_DEEP_RATIO_WARN', d.ratioWarn),
    ratioFail: envFloat('HEALTH_DEEP_RATIO_FAIL', d.ratioFail),
  };
}

@Injectable()
export class HealthDeepService {
  readonly thresholds = loadHealthDeepThresholds();

  private tapeCache: { value: number; at: number } | null = null;

  // НЕ параметр конструктора: Nest инжектит ВСЕ параметры @Injectable-класса, и
  // тип-функция валит подъём графа UnknownDependenciesException'ом — ровно инцидент
  // деплоя 24.08 (класс #2009). Часы — свойство с тестовым швом.
  private now: () => number = () => Date.now();

  constructor(private readonly prisma: PrismaService) {}

  /** Тестовый шов: подмена часов (TTL-кэш, budget). */
  setClockForTests(now: () => number): void {
    this.now = now;
  }

  /** Budget пробы базы: чуть выше fail-порога — дольше ждать незачем (M2: unreachable). */
  get dbBudgetMs(): number {
    return this.thresholds.dbFailMs + 500;
  }

  async snapshot(): Promise<HealthDeepSnapshot> {
    const startedAt = this.now();

    const db = await this.probeDb();
    const tapeLength = await this.readTapeLength(db.timedOut);
    const arrivedInWindow = ingestWindowGauge.arrivedInWindow(this.now());

    return {
      numbers: {
        tapeLength,
        dbLatencyMs: db.latencyMs,
        // Expected-источник (read-model пульса, кусок C) ещё не подключён к
        // кабинету — доля честно null, arrived-счётчик уже виден (M2: ∈[0,1]∪null).
        ingestArrivedRatio: null,
      },
      dbTimedOut: db.timedOut,
      arrivedInWindow,
      measuredAt: new Date(startedAt).toISOString(),
    };
  }

  private async probeDb(): Promise<{ latencyMs: number | null; timedOut: boolean }> {
    const t0 = this.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const budget = new Promise<'timeout'>((resolveTimeout) => {
      timer = setTimeout(() => resolveTimeout('timeout'), this.dbBudgetMs);
    });
    try {
      const raced = await Promise.race([
        this.prisma.$queryRaw`SELECT 1`.then(() => 'ok' as const),
        budget,
      ]);
      if (raced === 'timeout') return { latencyMs: null, timedOut: true };
      return { latencyMs: this.now() - t0, timedOut: false };
    } catch {
      // Ошибка соединения в budget — тоже «не дойти», числа best-effort.
      return { latencyMs: null, timedOut: true };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private async readTapeLength(dbTimedOut: boolean): Promise<number | null> {
    const nowMs = this.now();
    if (this.tapeCache !== null && nowMs - this.tapeCache.at < TAPE_TTL_MS) {
      return this.tapeCache.value;
    }
    if (dbTimedOut) {
      // База не отвечает — свежий count не добыть; отдаём устаревший кэш, если есть.
      return this.tapeCache?.value ?? null;
    }
    try {
      const [reports, liveRecords] = await Promise.all([
        this.prisma.telemetryReport.count(),
        this.prisma.telemetryLiveRecord.count(),
      ]);
      const value = reports + liveRecords;
      this.tapeCache = { value, at: nowMs };
      return value;
    } catch {
      return this.tapeCache?.value ?? null;
    }
  }
}
