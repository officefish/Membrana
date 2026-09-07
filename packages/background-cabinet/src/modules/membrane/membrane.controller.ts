import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  CreateAccessKeyDto,
  CreateNodeDto,
  SetBufferPolicyBindingDto,
  SetBufferPolicyDto,
} from './membrane.dto';
import { MembraneBufferPolicyService } from './membrane-buffer-policy.service';
import { MembraneService } from './membrane.service';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';

@ApiTags('Membranes')
@Controller('v1')
@UseGuards(SessionGuard)
export class MembraneController {
  constructor(
    private readonly membraneService: MembraneService,
    private readonly bufferPolicy: MembraneBufferPolicyService,
  ) {}

  /**
   * ПОЛИТИКА ПЕРЕПОЛНЕНИЯ БУФЕРА (#2308, M1). Три ручки записи ниже — origin команды оператора.
   * Конвенция 12.08: доменный отказ — `200 { ok:false, reason }` из закрытого списка
   * (`buffer-policy.ts`), 4xx остаются транспорту (401 — сессия, 403/404 — чужой/несуществующий
   * узел). Мембрана — из сессии, не из тела. Каждый успех несёт `contextSync: {updated, failed}`.
   */
  @Put('membranes/me/buffer-policy')
  @ApiOperation({
    summary: 'Set the membrane buffer overflow policy (stop | smart_cleanup with full params); fans out to all devices',
  })
  async setBufferPolicy(@Req() req: AuthenticatedRequest, @Body() body: SetBufferPolicyDto) {
    const membrane = await this.membraneService.getOrCreateMembraneForUser(req.authUser!.id);
    return this.bufferPolicy.setMembranePolicy(membrane.id, body);
  }

  @Put('membranes/me/buffer-policy/binding')
  @ApiOperation({
    summary: 'Set the "apply to all devices" binding; enabling requires confirmed=true; fans out to all devices',
  })
  async setBufferPolicyBinding(
    @Req() req: AuthenticatedRequest,
    @Body() body: SetBufferPolicyBindingDto,
  ) {
    const membrane = await this.membraneService.getOrCreateMembraneForUser(req.authUser!.id);
    return this.bufferPolicy.setBinding(membrane.id, body ?? {});
  }

  @Put('nodes/:nodeId/buffer-policy')
  @ApiOperation({
    summary: 'Set the per-device buffer overflow policy of a node (refused while the membrane binding is on)',
  })
  setNodeBufferPolicy(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
    @Body() body: SetBufferPolicyDto,
  ) {
    return this.bufferPolicy.setNodePolicy(req.authUser!.id, nodeId, body);
  }

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
