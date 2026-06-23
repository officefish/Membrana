import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBadRequest, ApiStandardErrors } from '../../common/swagger/api-decorators';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import {
  DeleteWorkspaceResultDto,
  DeviceWorkspaceListDto,
  DeviceWorkspaceRecordDto,
  SetActiveWorkspaceDto,
  WorkspaceConflictDto,
} from './device-workspaces.dto';
import { DeviceWorkspacesService } from './device-workspaces.service';

@ApiTags('Device workspaces')
@Controller('v1/devices/:deviceId/device-workspaces')
@UseGuards(ApiTokenGuard, DeviceGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class DeviceWorkspacesController {
  constructor(private readonly workspaces: DeviceWorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List user workspaces for device' })
  @ApiResponse({ status: 200, type: DeviceWorkspaceListDto })
  @ApiStandardErrors()
  listWorkspaces(@Param('deviceId') deviceId: string) {
    return this.workspaces.listWorkspaces(deviceId);
  }

  @Patch('active')
  @ApiOperation({ summary: 'Set active workspace id' })
  @ApiResponse({ status: 200 })
  @ApiStandardErrors()
  @ApiBadRequest()
  setActiveWorkspace(
    @Param('deviceId') deviceId: string,
    @Body() body: SetActiveWorkspaceDto,
  ) {
    return this.workspaces.setActiveWorkspace(deviceId, body.activeWorkspaceId);
  }

  @Get(':workspaceId')
  @ApiOperation({ summary: 'Get workspace document' })
  @ApiParam({ name: 'workspaceId' })
  @ApiResponse({ status: 200, type: DeviceWorkspaceRecordDto })
  @ApiStandardErrors()
  async getWorkspace(
    @Param('deviceId') deviceId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    const record = await this.workspaces.getWorkspace(deviceId, workspaceId);
    if (record === null) {
      throw new NotFoundException('Workspace not found');
    }
    return record;
  }

  @Put(':workspaceId')
  @ApiOperation({ summary: 'Replace workspace document' })
  @ApiParam({ name: 'workspaceId' })
  @ApiResponse({ status: 200, type: DeviceWorkspaceRecordDto })
  @ApiResponse({ status: 409, type: WorkspaceConflictDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  putWorkspace(
    @Param('deviceId') deviceId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() body: Record<string, unknown>,
    @Query('expectedUpdatedAt') expectedUpdatedAt?: string,
  ) {
    return this.workspaces.putWorkspace(deviceId, workspaceId, body, { expectedUpdatedAt });
  }

  @Delete(':workspaceId')
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiParam({ name: 'workspaceId' })
  @ApiResponse({ status: 200, type: DeleteWorkspaceResultDto })
  @ApiStandardErrors()
  deleteWorkspace(
    @Param('deviceId') deviceId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspaces.deleteWorkspace(deviceId, workspaceId);
  }
}
