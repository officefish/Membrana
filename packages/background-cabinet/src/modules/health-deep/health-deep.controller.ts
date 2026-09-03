import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { HealthDeepService } from './health-deep.service';
import { decideHealthDeep } from './health-deep.decide';
import {
  CabinetBusyException,
  CabinetUnreachableException,
} from '../../common/incident/failure-genus';

/**
 * `GET /health/deep` — предметные числа вместо «ок» (кусок D #2121, вердикт M2).
 *
 * Здоровый/деградирующий ответ — 200 c числами и порогами; fail-порог — 503 род
 * «занят» (клиент ждёт); база не ответила в budget — 503 род «не дойти». Отказы
 * идут через контракт куска B (#2119): AllExceptionsFilter отдаёт genus и (для
 * broken) номер происшествия. `/health` (liveness) НЕ трогается — оркестратор
 * живёт на нём, deep зовут руки и сборщики, не чаще раза в минуту.
 */
@ApiTags('Health')
@Controller()
export class HealthDeepController {
  constructor(private readonly service: HealthDeepService) {}

  @Get('health/deep')
  @ApiOperation({ summary: 'Return deep cabinet health numbers and thresholds' })
  async deep(@Req() req: FastifyRequest): Promise<Record<string, unknown>> {
    const requestId =
      typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : '';
    const snap = await this.service.snapshot();
    const numbers = {
      tape_length: snap.numbers.tapeLength,
      db_latency_ms: snap.numbers.dbLatencyMs,
      ingest_arrived_ratio: snap.numbers.ingestArrivedRatio,
      ingest_arrived_15m: snap.arrivedInWindow,
      measured_at: snap.measuredAt,
    };

    if (snap.dbTimedOut) {
      throw new CabinetUnreachableException(
        'postgres',
        `база не ответила в budget ${this.service.dbBudgetMs} мс`,
        numbers,
      );
    }

    const level = decideHealthDeep(snap.numbers, this.service.thresholds);
    if (level === 'fail') {
      throw new CabinetBusyException(30, 'предметный fail-порог /health/deep', numbers);
    }

    return {
      status: level === 'ok' ? 'ok' : 'degraded',
      genus: null,
      ...numbers,
      thresholds: this.service.thresholds,
      requestId,
    };
  }
}
