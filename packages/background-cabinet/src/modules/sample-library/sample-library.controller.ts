import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import { SampleLibraryService } from './sample-library.service';

@Controller('v1')
@UseGuards(SessionGuard)
export class SampleLibraryController {
  constructor(private readonly sampleLibrary: SampleLibraryService) {}

  @Get('membranes/:membraneId/nodes')
  listNodes(
    @Req() req: AuthenticatedRequest,
    @Param('membraneId') membraneId: string,
  ) {
    return this.sampleLibrary.listNodes(req.authUser!.id, membraneId);
  }

  @Get('membranes/:membraneId/catalog')
  getCatalog(
    @Req() req: AuthenticatedRequest,
    @Param('membraneId') membraneId: string,
  ) {
    return this.sampleLibrary.getCatalog(req.authUser!.id, membraneId);
  }

  @Get('media/session')
  getMediaSession(@Req() req: AuthenticatedRequest) {
    return this.sampleLibrary.getMediaSession(req.authUser!.id);
  }
}
