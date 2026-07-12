import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { NightTriageService } from './night-triage.service';

@ApiTags('night-triage')
@ApiBearerAuth('X-Membrana-Token')
@UseGuards(ApiTokenGuard)
@Controller('v1/night-triage')
export class NightTriageController {
  constructor(private readonly nightTriage: NightTriageService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run night triage once (deterministic; creates draft PR)' })
  async run() {
    return this.nightTriage.run();
  }
}
