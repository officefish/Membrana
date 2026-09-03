import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CreateAccessKeyDto, CreateNodeDto } from './membrane.dto';
import { MembraneService } from './membrane.service';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';

@ApiTags('Membranes')
@Controller('v1')
@UseGuards(SessionGuard)
export class MembraneController {
  constructor(private readonly membraneService: MembraneService) {}

  @Get('membranes/me')
  @ApiOperation({ summary: 'Return the authenticated user membrane' })
  me(@Req() req: AuthenticatedRequest) {
    return this.membraneService.getMembraneView(req.authUser!.id);
  }

  @Post('membranes/me/nodes')
  @ApiOperation({ summary: 'Create a node in the authenticated user membrane' })
  createNode(@Req() req: AuthenticatedRequest, @Body() body: CreateNodeDto) {
    return this.membraneService.createNode(req.authUser!.id, body.label);
  }

  @Delete('nodes/:nodeId')
  @ApiOperation({ summary: 'Delete a node from the authenticated user membrane' })
  deleteNode(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.membraneService.deleteNode(req.authUser!.id, nodeId);
  }

  @Post('nodes/:nodeId/access-keys')
  @ApiOperation({ summary: 'Create an access key for a node' })
  createAccessKey(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
    @Body() body: CreateAccessKeyDto,
  ) {
    return this.membraneService.createAccessKey(req.authUser!.id, nodeId, body.duration);
  }

  @Post('access-keys/:keyId/revoke')
  @ApiOperation({ summary: 'Revoke an access key' })
  revokeAccessKey(@Req() req: AuthenticatedRequest, @Param('keyId') keyId: string) {
    return this.membraneService.revokeAccessKey(req.authUser!.id, keyId);
  }

  @Post('nodes/:nodeId/access-keys/purge-revoked')
  @ApiOperation({ summary: 'Purge revoked access keys for a node' })
  purgeRevokedAccessKeys(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
  ) {
    return this.membraneService.purgeInactiveAccessKeys(req.authUser!.id, nodeId);
  }

  @Post('nodes/:nodeId/access-keys/purge-inactive')
  @ApiOperation({ summary: 'Purge inactive access keys for a node' })
  purgeInactiveAccessKeys(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
  ) {
    return this.membraneService.purgeInactiveAccessKeys(req.authUser!.id, nodeId);
  }

  @Delete('access-keys/:keyId')
  @ApiOperation({ summary: 'Delete an access key' })
  deleteAccessKey(@Req() req: AuthenticatedRequest, @Param('keyId') keyId: string) {
    return this.membraneService.deleteAccessKey(req.authUser!.id, keyId);
  }
}
