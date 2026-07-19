import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { getPackageJsonPath } from './lib/paths';
import {
  formatOutboundSelfCheckTable,
  runOutboundSelfCheck,
  type OutboundProbeResult,
} from './lib/outbound-self-check';

let cachedVersion: string | undefined;

function readVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const raw = readFileSync(getPackageJsonPath(), 'utf8');
    const v = (JSON.parse(raw) as { version?: string }).version;
    cachedVersion = typeof v === 'string' ? v : '0.0.0';
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion;
}

export type ReadyCheck = {
  id: string;
  reachable: boolean;
  latencyMs: number;
  httpStatus: number | null;
  note: string;
};

export type ReadyResponse = {
  ready: boolean;
  version: string;
  uptime: number;
  checks: ReadyCheck[];
};

function toReadyChecks(results: readonly OutboundProbeResult[]): ReadyCheck[] {
  return results.map((r) => ({
    id: r.id,
    reachable: r.reachable,
    latencyMs: r.latencyMs,
    httpStatus: r.httpStatus,
    note: r.note,
  }));
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Server health check (liveness — no outbound calls)' })
  @ApiResponse({
    status: 200,
    description: 'Server is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        version: { type: 'string', example: '0.1.0' },
        uptime: { type: 'number', example: 123 },
      },
    },
  })
  health(): { status: string; version: string; uptime: number } {
    return {
      status: 'ok',
      version: readVersion(),
      uptime: Math.floor(process.uptime()),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness — outbound self-check (Anthropic/Linear/GitHub/Perplexity)',
  })
  @ApiResponse({
    status: 200,
    description: 'Always 200 while process is up; see body.ready for dependency status',
  })
  async ready(): Promise<ReadyResponse> {
    const results = await runOutboundSelfCheck();
    const ready = results.every((r) => r.reachable);
    return {
      ready,
      version: readVersion(),
      uptime: Math.floor(process.uptime()),
      checks: toReadyChecks(results),
    };
  }
}

/** Для отладки / логов — таблица как у CLI. */
export function formatReadyChecksTable(checks: readonly ReadyCheck[]): string {
  return formatOutboundSelfCheckTable(
    checks.map((c) => ({
      id: c.id as OutboundProbeResult['id'],
      label: c.id,
      url: '',
      reachable: c.reachable,
      latencyMs: c.latencyMs,
      httpStatus: c.httpStatus,
      note: c.note,
    })),
  );
}
