import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import {
  parseAcquireScenarioEditLeaseDto,
  parseRenewScenarioEditLeaseDto,
} from './scenario-edit-lease.dto';
import { ScenarioEditLeaseService } from './scenario-edit-lease.service';

@Controller('v1')
@UseGuards(SessionGuard)
export class ScenarioEditLeaseController {
  constructor(private readonly leaseService: ScenarioEditLeaseService) {}

  @Post('nodes/:nodeId/scenario/edit-lease')
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
  release(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.leaseService.release(req.authUser!.id, req.authSessionId!, nodeId);
  }
}
