import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiBadRequest, ApiStandardErrors } from '../../common/swagger/api-decorators';
import { OkResponseDto } from '../../common/swagger/common.dto';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import { parseSamplesPageQuery } from '../../lib/pagination';
import {
  MoveSampleDto,
  PaginatedSamplesResponseDto,
  PatchSampleLabelDto,
  SampleResponseDto,
  UploadSampleMultipartDto,
} from './samples.dto';
import type { UploadMetaOverride } from './samples.service';
import { SamplesService } from './samples.service';

@ApiTags('Samples')
@Controller('v1/devices/:deviceId')
@UseGuards(ApiTokenGuard, DeviceGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiHeader({ name: 'X-Membrana-Device-Id', required: false })
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class SamplesController {
  constructor(private readonly samples: SamplesService) {}

  @Get('collections/:collectionId/samples')
  @ApiOperation({ summary: 'List samples in collection (paginated, 40 per page by default)' })
  @ApiParam({ name: 'collectionId' })
  @ApiResponse({ status: 200, type: PaginatedSamplesResponseDto })
  @ApiStandardErrors()
  list(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = parseSamplesPageQuery(page, limit);
    return this.samples.list(deviceId, collectionId, parsed.page, parsed.limit);
  }

  @Post('collections/:collectionId/samples')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadSampleMultipartDto })
  @ApiOperation({ summary: 'Upload audio sample (multipart: file, optional meta JSON field)' })
  @ApiParam({ name: 'collectionId' })
  @ApiResponse({ status: 201, type: SampleResponseDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  @ApiResponse({ status: 413, description: 'Device storage quota exceeded' })
  async upload(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
    @Req() req: FastifyRequest,
  ) {
    const part = await req.file();
    if (!part) {
      throw new BadRequestException('Missing file field in multipart upload');
    }
    const buffer = await part.toBuffer();
    let meta: UploadMetaOverride | undefined;
    const metaField = part.fields?.meta;
    if (metaField && 'value' in metaField && typeof metaField.value === 'string') {
      try {
        meta = JSON.parse(metaField.value) as UploadMetaOverride;
      } catch {
        meta = undefined;
      }
    }
    return this.samples.upload(deviceId, collectionId, buffer, part.mimetype, meta);
  }

  @Get('samples/:sampleId/blob')
  @ApiProduces('audio/wav', 'audio/mpeg', 'audio/flac', 'audio/ogg', 'application/octet-stream')
  @ApiOperation({ summary: 'Stream sample audio blob' })
  @ApiParam({ name: 'sampleId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Binary audio stream' })
  @ApiStandardErrors()
  async blob(
    @Param('deviceId') deviceId: string,
    @Param('sampleId') sampleId: string,
    @Res() reply: FastifyReply,
  ) {
    const { stream, contentType } = await this.samples.getBlob(deviceId, sampleId);
    void reply.header('Content-Type', contentType);
    return reply.send(stream);
  }

  @Post('samples/:sampleId/drone-detection-report')
  @ApiOperation({
    summary: 'Run full drone-detection-report/v1 (DDR2) on the sample (WAV-only, LP1b)',
  })
  @ApiParam({ name: 'sampleId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'drone-detection-report/v1 payload' })
  @ApiStandardErrors()
  @ApiResponse({ status: 422, description: 'Unsupported audio format (WAV-only)' })
  droneDetectionReport(
    @Param('deviceId') deviceId: string,
    @Param('sampleId') sampleId: string,
  ) {
    return this.samples.analyzeDroneDetection(deviceId, sampleId);
  }

  @Delete('samples/:sampleId')
  @ApiOperation({ summary: 'Delete sample and blob' })
  @ApiParam({ name: 'sampleId', format: 'uuid' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  @ApiStandardErrors()
  async remove(
    @Param('deviceId') deviceId: string,
    @Param('sampleId') sampleId: string,
  ) {
    await this.samples.delete(deviceId, sampleId);
    return { ok: true };
  }

  @Post('samples/:sampleId/move')
  @ApiOperation({ summary: 'Move sample to another collection' })
  @ApiParam({ name: 'sampleId', format: 'uuid' })
  @ApiResponse({ status: 200, type: SampleResponseDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  move(
    @Param('deviceId') deviceId: string,
    @Param('sampleId') sampleId: string,
    @Body() body: MoveSampleDto,
  ) {
    if (!body?.toCollectionId) {
      throw new BadRequestException('toCollectionId required');
    }
    return this.samples.move(deviceId, sampleId, body.toCollectionId);
  }

  @Patch('samples/:sampleId')
  @ApiOperation({ summary: 'Update sample label and/or notes (VDR1 ground truth)' })
  @ApiParam({ name: 'sampleId', format: 'uuid' })
  @ApiResponse({ status: 200, type: SampleResponseDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  @ApiResponse({ status: 403, description: 'Tariff dataset requires X-Membrana-Catalog-Admin' })
  patchLabel(
    @Param('deviceId') deviceId: string,
    @Param('sampleId') sampleId: string,
    @Body() body: PatchSampleLabelDto,
    @Req() req: FastifyRequest,
  ) {
    if (body.label === undefined && body.notes === undefined) {
      throw new BadRequestException('At least one of label or notes required');
    }
    const catalogAdmin = req.headers['x-membrana-catalog-admin'] === '1';
    return this.samples.updateLabelNotes(deviceId, sampleId, body, { catalogAdmin });
  }
}
