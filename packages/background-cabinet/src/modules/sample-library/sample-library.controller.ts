import { Controller, Get, Param, Patch, Body, Req, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import type { PatchCatalogSampleDto } from './sample-library.dto';
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sampleLibrary.getCatalog(req.authUser!.id, membraneId, page, limit);
  }

  @Get('media/session')
  getMediaSession(@Req() req: AuthenticatedRequest) {
    return this.sampleLibrary.getMediaSession(req.authUser!.id);
  }

  @Patch('membranes/:membraneId/catalog/samples/:sampleId')
  @UseGuards(SessionGuard, AdminGuard)
  patchCatalogSample(
    @Req() req: AuthenticatedRequest,
    @Param('membraneId') membraneId: string,
    @Param('sampleId') sampleId: string,
    @Body() body: PatchCatalogSampleDto,
  ) {
    return this.sampleLibrary.patchCatalogSample(
      req.authUser!.id,
      membraneId,
      sampleId,
      body,
    );
  }
}
