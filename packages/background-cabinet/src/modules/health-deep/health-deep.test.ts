import { describe, expect, it, vi } from 'vitest';

import {
  decideHealthDeep,
  DEFAULT_HEALTH_DEEP_THRESHOLDS,
} from './health-deep.decide';
import { IngestWindowGauge } from './ingest-window.gauge';
import { HealthDeepService } from './health-deep.service';
import { HealthDeepController } from './health-deep.controller';
import {
  CabinetBusyException,
  CabinetUnreachableException,
} from '../../common/incident/failure-genus';
import type { PrismaService } from '../../prisma/prisma.service';

const T = DEFAULT_HEALTH_DEEP_THRESHOLDS;

describe('decideHealthDeep — пороги с физическим смыслом (вердикт M2)', () => {
  it('РЕТРО-ПРЕДИКАТ 23.08 (обязательная фикстура DoD): лента 2400 → не «ок»', () => {
    // До α-калибровки лента судит не выше warn (fail не вооружён) — но «ок» не рисуется.
    expect(decideHealthDeep({ tapeLength: 2400, dbLatencyMs: 100, ingestArrivedRatio: null }, T)).toBe('warn');
  });

  it('находка прод 24.08: лента 3209 при базе 2 мс → degraded, НЕ busy (шум снят)', () => {
    expect(decideHealthDeep({ tapeLength: 3209, dbLatencyMs: 2, ingestArrivedRatio: null }, T)).toBe('warn');
  });

  it('после калибровки (tapeFail вооружён env) лента даёт fail', () => {
    expect(
      decideHealthDeep({ tapeLength: 5000, dbLatencyMs: 2, ingestArrivedRatio: null }, { ...T, tapeFail: 4800 }),
    ).toBe('fail');
  });

  it('РЕТРО-ПРЕДИКАТ 23.08: задержка базы 3900 мс → не «ок»', () => {
    expect(decideHealthDeep({ tapeLength: 10, dbLatencyMs: 3900, ingestArrivedRatio: null }, T)).toBe('fail');
  });

  it('warn-пороги: лента 2400 / база 1000 мс / доля 0,9 → degraded, не fail', () => {
    expect(decideHealthDeep({ tapeLength: 2400, dbLatencyMs: 10, ingestArrivedRatio: null }, T)).toBe('warn');
    expect(decideHealthDeep({ tapeLength: 10, dbLatencyMs: 1000, ingestArrivedRatio: null }, T)).toBe('warn');
    expect(decideHealthDeep({ tapeLength: 10, dbLatencyMs: 10, ingestArrivedRatio: 0.9 }, T)).toBe('warn');
  });

  it('доля доехавших ниже 0,80 → fail; здоровые числа → ok', () => {
    expect(decideHealthDeep({ tapeLength: 10, dbLatencyMs: 10, ingestArrivedRatio: 0.7 }, T)).toBe('fail');
    expect(decideHealthDeep({ tapeLength: 10, dbLatencyMs: 10, ingestArrivedRatio: 1 }, T)).toBe('ok');
  });

  it('null-величина не судится — прибор не рисует ни зелёное, ни красное из «не мерено»', () => {
    expect(decideHealthDeep({ tapeLength: null, dbLatencyMs: null, ingestArrivedRatio: null }, T)).toBe('ok');
  });
});

describe('IngestWindowGauge — датчик пути записи, окно 900 с', () => {
  it('считает только окно, старое вытесняется', () => {
    const g = new IngestWindowGauge(900_000);
    const t0 = 1_756_000_000_000;
    g.recordArrived(t0);
    g.recordArrived(t0 + 100_000);
    expect(g.arrivedInWindow(t0 + 200_000)).toBe(2);
    expect(g.arrivedInWindow(t0 + 950_000)).toBe(1);
    expect(g.arrivedInWindow(t0 + 2_000_000)).toBe(0);
  });
});

type PrismaMock = {
  $queryRaw: ReturnType<typeof vi.fn>;
  telemetryReport: { count: ReturnType<typeof vi.fn> };
  telemetryLiveRecord: { count: ReturnType<typeof vi.fn> };
};

function makePrisma(overrides: Partial<PrismaMock> = {}): PrismaMock {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    telemetryReport: { count: vi.fn().mockResolvedValue(100) },
    telemetryLiveRecord: { count: vi.fn().mockResolvedValue(50) },
    ...overrides,
  };
}

function makeService(prisma: PrismaMock, nowRef: { t: number }) {
  const svc = new HealthDeepService(prisma as unknown as PrismaService);
  svc.setClockForTests(() => nowRef.t);
  return svc;
}

describe('HealthDeepService — дешёвые источники (M2: p99, без Θ(N²) на request-path)', () => {
  it('лента = reports + liveRecords; TTL-кэш 30 с не дёргает базу повторно', async () => {
    const prisma = makePrisma();
    const nowRef = { t: 1_756_000_000_000 };
    const svc = makeService(prisma, nowRef);
    const s1 = await svc.snapshot();
    expect(s1.numbers.tapeLength).toBe(150);
    nowRef.t += 10_000; // внутри TTL
    await svc.snapshot();
    expect(prisma.telemetryReport.count).toHaveBeenCalledTimes(1);
    nowRef.t += 31_000; // TTL истёк
    await svc.snapshot();
    expect(prisma.telemetryReport.count).toHaveBeenCalledTimes(2);
  });

  it('проба базы, не уложившаяся в budget → dbTimedOut, числа best-effort из кэша', async () => {
    const prisma = makePrisma();
    const nowRef = { t: 1_756_000_000_000 };
    const svc = makeService(prisma, nowRef);
    await svc.snapshot(); // прогрели кэш ленты
    prisma.$queryRaw.mockImplementation(
      () => new Promise(() => undefined), // висит дольше budget
    );
    const s = await svc.snapshot();
    expect(s.dbTimedOut).toBe(true);
    expect(s.numbers.dbLatencyMs).toBeNull();
    expect(s.numbers.tapeLength).toBe(150); // устаревший кэш честнее null
  });

  it('ingest_arrived_ratio = null, пока не подключён источник expected (честное «не мерено»)', async () => {
    const svc = makeService(makePrisma(), { t: 1_756_000_000_000 });
    const s = await svc.snapshot();
    expect(s.numbers.ingestArrivedRatio).toBeNull();
  });
});

function makeReq(requestId = 'req-42') {
  return { headers: { 'x-request-id': requestId } } as never;
}

describe('HealthDeepController — контракт ответа по M1/M2', () => {
  it('здоровые числа → 200 «ok» с числами, порогами и requestId; genus null', async () => {
    const svc = makeService(makePrisma(), { t: 1_756_000_000_000 });
    const ctrl = new HealthDeepController(svc);
    const body = await ctrl.deep(makeReq());
    expect(body.status).toBe('ok');
    expect(body.genus).toBeNull();
    expect(body.tape_length).toBe(150);
    expect(typeof body.measured_at).toBe('string');
    expect(body.requestId).toBe('req-42');
    expect(body.thresholds).toEqual(svc.thresholds);
  });

  it('fail-порог (вооружённый env после калибровки) → CabinetBusyException с числами внутри', async () => {
    process.env.HEALTH_DEEP_TAPE_FAIL = '2400';
    try {
      const prisma = makePrisma({
        telemetryReport: { count: vi.fn().mockResolvedValue(2000) },
        telemetryLiveRecord: { count: vi.fn().mockResolvedValue(1000) },
      });
      const ctrl = new HealthDeepController(makeService(prisma, { t: 1_756_000_000_000 }));
      await expect(ctrl.deep(makeReq())).rejects.toSatisfy((e: unknown) => {
        expect(e).toBeInstanceOf(CabinetBusyException);
        const busy = e as CabinetBusyException;
        expect(busy.extra.tape_length).toBe(3000);
        return true;
      });
    } finally {
      delete process.env.HEALTH_DEEP_TAPE_FAIL;
    }
  });

  it('до калибровки длинная лента даёт 200 degraded, не busy (находка прод 24.08)', async () => {
    const prisma = makePrisma({
      telemetryReport: { count: vi.fn().mockResolvedValue(2209) },
      telemetryLiveRecord: { count: vi.fn().mockResolvedValue(1000) },
    });
    const ctrl = new HealthDeepController(makeService(prisma, { t: 1_756_000_000_000 }));
    const body = await ctrl.deep(makeReq());
    expect(body.status).toBe('degraded');
    expect(body.tape_length).toBe(3209);
  });

  it('база молчит дольше budget → CabinetUnreachableException(postgres)', async () => {
    const prisma = makePrisma({
      $queryRaw: vi.fn().mockImplementation(() => new Promise(() => undefined)),
    });
    const ctrl = new HealthDeepController(makeService(prisma, { t: 1_756_000_000_000 }));
    await expect(ctrl.deep(makeReq())).rejects.toSatisfy((e: unknown) => {
      expect(e).toBeInstanceOf(CabinetUnreachableException);
      expect((e as CabinetUnreachableException).dependency).toBe('postgres');
      return true;
    });
  });
});
