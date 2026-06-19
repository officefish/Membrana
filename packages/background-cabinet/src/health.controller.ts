import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { getPackageJsonPath } from './lib/paths';

let cachedVersion: string | undefined;
let cachedProtocolVersion: number | undefined;

/**
 * Версия рантайм-протокола node-realtime — единый источник в @membrana/core (ESM).
 * Пакет cabinet — CommonJS, поэтому ESM-значение тянем динамическим import() (с кэшем).
 */
async function readProtocolVersion(): Promise<number> {
  if (cachedProtocolVersion !== undefined) return cachedProtocolVersion;
  const core = await import('@membrana/core');
  cachedProtocolVersion = core.RUNTIME_PROTOCOL_VERSION;
  return cachedProtocolVersion;
}

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

@Controller()
export class HealthController {
  @Get('health')
  async health(): Promise<{
    status: string;
    version: string;
    protocolVersion: number;
    uptime: number;
  }> {
    return {
      status: 'ok',
      version: readVersion(),
      // DR6: версия рантайм-контракта node-realtime — клиент сверяет со своей.
      protocolVersion: await readProtocolVersion(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
