import { Controller, Get, Param, Patch, Body, Req, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../common/guards/admin.guard';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import type { PatchCatalogSampleDto } from './sample-library.dto';
import { SampleLibraryService } from './sample-library.service';

@ApiTags('Sample library')
@Controller('v1')
@UseGuards(SessionGuard)
export class SampleLibraryController {
  constructor(private readonly sampleLibrary: SampleLibraryService) {}

  @Get('membranes/:membraneId/nodes')
  @ApiOperation({ summary: 'List nodes for a membrane sample-library view' })
  listNodes(
    @Req() req: AuthenticatedRequest,
    @Param('membraneId') membraneId: string,
  ) {
    return this.sampleLibrary.listNodes(req.authUser!.id, membraneId);
  }

  @Get('membranes/:membraneId/catalog')
  @ApiOperation({ summary: 'Return the sample catalog for a membrane' })
  getCatalog(
    @Req() req: AuthenticatedRequest,
    @Param('membraneId') membraneId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sampleLibrary.getCatalog(req.authUser!.id, membraneId, page, limit);
  }

  @Get('media/session')
  @ApiOperation({ summary: 'Return media session settings for the authenticated user' })
  getMediaSession(@Req() req: AuthenticatedRequest) {
    return this.sampleLibrary.getMediaSession(req.authUser!.id);
  }

  @Patch('membranes/:membraneId/catalog/samples/:sampleId')
  @UseGuards(SessionGuard, AdminGuard)
  @ApiOperation({ summary: 'Patch a catalog sample as an admin user' })
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
