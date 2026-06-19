import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { CreateAccessKeyDto, CreateNodeDto } from './membrane.dto';
import { MembraneService } from './membrane.service';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';

@Controller('v1')
@UseGuards(SessionGuard)
export class MembraneController {
  constructor(private readonly membraneService: MembraneService) {}

  @Get('membranes/me')
  me(@Req() req: AuthenticatedRequest) {
    return this.membraneService.getMembraneView(req.authUser!.id);
  }

  @Post('membranes/me/nodes')
  createNode(@Req() req: AuthenticatedRequest, @Body() body: CreateNodeDto) {
    return this.membraneService.createNode(req.authUser!.id, body.label);
  }

  @Delete('nodes/:nodeId')
  deleteNode(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.membraneService.deleteNode(req.authUser!.id, nodeId);
  }

  @Post('nodes/:nodeId/access-keys')
  createAccessKey(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
    @Body() body: CreateAccessKeyDto,
  ) {
    return this.membraneService.createAccessKey(req.authUser!.id, nodeId, body.duration);
  }

  @Post('access-keys/:keyId/revoke')
  revokeAccessKey(@Req() req: AuthenticatedRequest, @Param('keyId') keyId: string) {
    return this.membraneService.revokeAccessKey(req.authUser!.id, keyId);
  }

  @Post('nodes/:nodeId/access-keys/purge-revoked')
  purgeRevokedAccessKeys(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
  ) {
    return this.membraneService.purgeInactiveAccessKeys(req.authUser!.id, nodeId);
  }

  @Post('nodes/:nodeId/access-keys/purge-inactive')
  purgeInactiveAccessKeys(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
  ) {
    return this.membraneService.purgeInactiveAccessKeys(req.authUser!.id, nodeId);
  }

  @Delete('access-keys/:keyId')
  deleteAccessKey(@Req() req: AuthenticatedRequest, @Param('keyId') keyId: string) {
    return this.membraneService.deleteAccessKey(req.authUser!.id, keyId);
  }
}
