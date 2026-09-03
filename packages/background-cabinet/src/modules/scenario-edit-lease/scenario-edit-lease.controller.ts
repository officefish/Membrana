import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import {
  parseAcquireScenarioEditLeaseDto,
  parseRenewScenarioEditLeaseDto,
} from './scenario-edit-lease.dto';
import { ScenarioEditLeaseService } from './scenario-edit-lease.service';

@ApiTags('Scenario edit leases')
@Controller('v1')
@UseGuards(SessionGuard)
export class ScenarioEditLeaseController {
  constructor(private readonly leaseService: ScenarioEditLeaseService) {}

  @Post('nodes/:nodeId/scenario/edit-lease')
  @ApiOperation({ summary: 'Acquire a scenario edit lease for a node' })
  acquire(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
    @Body() body: unknown,
  ) {
    const dto = parseAcquireScenarioEditLeaseDto(body);
    return this.leaseService.acquire(
      req.authUser!.id,
      req.authSessionId!,
      nodeId,
      dto.revision ?? 0,
    );
  }

  @Post('nodes/:nodeId/scenario/edit-lease/renew')
  @ApiOperation({ summary: 'Renew a scenario edit lease for a node' })
  renew(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
    @Body() body: unknown,
  ) {
    const dto = parseRenewScenarioEditLeaseDto(body);
    return this.leaseService.renew(
      req.authUser!.id,
      req.authSessionId!,
      nodeId,
      dto.revision,
    );
  }

  @Delete('nodes/:nodeId/scenario/edit-lease')
  @ApiOperation({ summary: 'Release a scenario edit lease for a node' })
  release(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.leaseService.release(req.authUser!.id, req.authSessionId!, nodeId);
  }
}
