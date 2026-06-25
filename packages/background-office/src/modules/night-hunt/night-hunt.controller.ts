import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import type { NightHuntJobId } from './night-hunt-jobs';
import { getNightHuntJob } from './night-hunt-jobs';
import { NightHuntService } from './night-hunt.service';

@ApiTags('night-hunt')
@ApiBearerAuth('X-Membrana-Token')
@UseGuards(ApiTokenGuard)
@Controller('v1/night-hunt')
export class NightHuntController {
  constructor(private readonly nightHunt: NightHuntService) {}

  @Post('run/:jobId')
  @ApiOperation({ summary: 'Run one night-hunt job (optional; creates PR on success)' })
  async run(@Param('jobId') jobId: string) {
    if (!getNightHuntJob(jobId)) {
      return { ok: false, error: `unknown job: ${jobId}` };
    }
    return this.nightHunt.runJob(jobId as NightHuntJobId);
  }

  @Post('run-all')
  @ApiOperation({ summary: 'Run all night-hunt jobs sequentially (optional)' })
  async runAll() {
    const jobs = ['design-token-drift', 'services-api-contract-drift', 'monorepo-dependency-graph'] as const;
    const results = [];
    for (const id of jobs) {
      results.push({ id, ...(await this.nightHunt.runJob(id)) });
    }
    return { ok: true, results };
  }
}
