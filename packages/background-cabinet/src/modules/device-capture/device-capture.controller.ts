import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import { parseCaptureDeviceDto } from './device-capture.dto';
import { DeviceCaptureService } from './device-capture.service';

@Controller('v1')
@UseGuards(SessionGuard)
export class DeviceCaptureController {
  constructor(private readonly captureService: DeviceCaptureService) {}

  /** CX2: снапшот активных захватов — bootstrap кабинета после навигации/перезагрузки. */
  @Get('captures')
  list(@Req() req: AuthenticatedRequest) {
    return this.captureService.listForUser(req.authUser!.id);
  }

  @Post('nodes/:nodeId/capture')
  capture(
    @Req() req: AuthenticatedRequest,
    @Param('nodeId') nodeId: string,
    @Body() body: unknown,
  ) {
    const dto = parseCaptureDeviceDto(body);
    return this.captureService.capture(req.authUser!.id, req.authSessionId!, nodeId, dto.mode);
  }

  @Delete('nodes/:nodeId/capture')
  release(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.captureService.release(req.authUser!.id, req.authSessionId!, nodeId);
  }
}
