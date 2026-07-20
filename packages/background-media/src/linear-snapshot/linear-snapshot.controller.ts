/**
 * Internal trigger: office (или cron) заказывает снимок через существующий
 * `X-Membrana-Token` / `API_INTERNAL_TOKEN`. Ключ Linear в запросе НЕ передаётся
 * (вердикт M2 / К2).
 */
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiStandardErrors } from '../common/swagger/api-decorators';
import { API_TOKEN_SECURITY } from '../common/swagger/openapi.constants';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import { LinearSnapshotTriggerService } from './linear-snapshot.trigger';
import type { LinearSnapshot, LinearSnapshotTrigger } from './linear-snapshot.types';
import { LinearSnapshotService } from './linear-snapshot.service';
import { pullOk } from './pull-ok';

const ALLOWED_TRIGGERS = new Set<LinearSnapshotTrigger>([
  'webhook',
  'evening-signal',
  'manual',
  'office-trigger',
]);

interface CaptureBody {
  trigger?: string;
  /** Если true — материализовать файл на диск media (LINEAR_SNAPSHOT_DIR). */
  persist?: boolean;
}

@ApiTags('Linear snapshot')
@Controller('v1/linear-snapshots')
@UseGuards(ApiTokenGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
export class LinearSnapshotController {
  constructor(
    private readonly triggers: LinearSnapshotTriggerService,
    private readonly producer: LinearSnapshotService,
  ) {}

  @Post('capture')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Trigger batch-full-pull snapshot on media-NL (no Linear key in request)',
  })
  @ApiResponse({ status: 200, description: 'linear-snapshot@1 artifact' })
  @ApiStandardErrors()
  async capture(@Body() body: CaptureBody = {}): Promise<{
    snapshot: LinearSnapshot;
    pullOk: boolean;
    filePath: string | null;
  }> {
    const raw = body.trigger ?? 'office-trigger';
    const trigger: LinearSnapshotTrigger = ALLOWED_TRIGGERS.has(raw as LinearSnapshotTrigger)
      ? (raw as LinearSnapshotTrigger)
      : 'office-trigger';
    const snapshot = await this.triggers.signal(trigger);
    const filePath =
      body.persist === true ? this.producer.writeSnapshot(snapshot) : null;
    return {
      snapshot,
      pullOk: pullOk(snapshot),
      filePath,
    };
  }
}
