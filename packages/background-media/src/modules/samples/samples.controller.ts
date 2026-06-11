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
import { ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DeviceGuard } from '../../common/guards/device.guard';
import type { UploadMetaOverride } from './samples.service';
import { SamplesService } from './samples.service';

@ApiTags('Samples')
@Controller('v1/devices/:deviceId')
@UseGuards(ApiTokenGuard, DeviceGuard)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiHeader({ name: 'X-Membrana-Device-Id', required: false })
export class SamplesController {
  constructor(private readonly samples: SamplesService) {}

  @Get('collections/:collectionId/samples')
  @ApiOperation({ summary: 'List samples in collection' })
  list(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
  ) {
    return this.samples.list(deviceId, collectionId);
  }

  @Post('collections/:collectionId/samples')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload audio sample (multipart: file, optional meta JSON field)' })
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
  @ApiOperation({ summary: 'Stream sample audio blob' })
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
  async remove(
    @Param('deviceId') deviceId: string,
    @Param('sampleId') sampleId: string,
  ) {
    await this.samples.delete(deviceId, sampleId);
    return { ok: true };
  }

  @Post('samples/:sampleId/move')
  @ApiOperation({ summary: 'Move sample to another collection' })
  move(
    @Param('deviceId') deviceId: string,
    @Param('sampleId') sampleId: string,
    @Body() body: { toCollectionId: string },
  ) {
    if (!body?.toCollectionId) {
      throw new BadRequestException('toCollectionId required');
    }
    return this.samples.move(deviceId, sampleId, body.toCollectionId);
  }
}
