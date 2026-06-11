import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { getPackageJsonPath } from './lib/paths';

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

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Server health check' })
  @ApiResponse({ status: 200, description: 'Server is healthy' })
  health(): { status: string; version: string; uptime: number } {
    return {
      status: 'ok',
      version: readVersion(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
