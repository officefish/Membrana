import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import { NodeLinkStateService } from './node-liveness.service';

@Controller('v1')
@UseGuards(SessionGuard)
export class NodeLivenessController {
  constructor(private readonly linkStateService: NodeLinkStateService) {}

  @Get('nodes/:nodeId/link-state')
  linkState(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.linkStateService.linkState(req.authUser!.id, nodeId);
  }

  @Post('nodes/:nodeId/health-ping')
  @HttpCode(200)
  healthPing(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.linkStateService.healthPing(req.authUser!.id, nodeId);
  }
}
