import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
import {
  MoveSampleDto,
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
  @ApiOperation({ summary: 'List samples in collection' })
  @ApiParam({ name: 'collectionId' })
  @ApiResponse({ status: 200, type: [SampleResponseDto] })
  @ApiStandardErrors()
  list(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
  ) {
    return this.samples.list(deviceId, collectionId);
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
}
