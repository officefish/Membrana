import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import { parseCaptureDeviceDto } from './device-capture.dto';
import { DeviceCaptureService } from './device-capture.service';

@ApiTags('Node capture')
@Controller('v1')
@UseGuards(SessionGuard)
export class DeviceCaptureController {
  constructor(private readonly captureService: DeviceCaptureService) {}

  /** CX2: снапшот активных захватов — bootstrap кабинета после навигации/перезагрузки. */
  @Get('captures')
  @ApiOperation({ summary: 'List active node captures for the authenticated user' })
  list(@Req() req: AuthenticatedRequest) {
    return this.captureService.listForUser(req.authUser!.id);
  }

  @Post('nodes/:nodeId/capture')
  @ApiOperation({ summary: 'Capture a node for the current session' })
  capture(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
    @Body() body: unknown,
  ) {
    const dto = parseCaptureDeviceDto(body);
    return this.captureService.capture(req.authUser!.id, req.authSessionId!, nodeId, dto.mode);
  }

  @Delete('nodes/:nodeId/capture')
  @ApiOperation({ summary: 'Release the current session capture for a node' })
  release(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.captureService.release(req.authUser!.id, req.authSessionId!, nodeId);
  }
}
