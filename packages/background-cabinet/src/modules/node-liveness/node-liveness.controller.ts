import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import { NodeLinkStateService } from './node-liveness.service';

@ApiTags('Node liveness')
@Controller('v1')
@UseGuards(SessionGuard)
export class NodeLivenessController {
  constructor(private readonly linkStateService: NodeLinkStateService) {}

  @Get('nodes/:nodeId/link-state')
  @ApiOperation({ summary: 'Return node link-state for the authenticated user' })
  linkState(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.linkStateService.linkState(req.authUser!.id, nodeId);
  }

  @Post('nodes/:nodeId/health-ping')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record a node health ping' })
  healthPing(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.linkStateService.healthPing(req.authUser!.id, nodeId);
  }
}
