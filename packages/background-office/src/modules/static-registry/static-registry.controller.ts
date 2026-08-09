import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import {
  StaticRegistryErrorResponseDto,
  StaticRegistryLineageResponseDto,
  StaticRegistryRecordResponseDto,
  toStaticRegistryLineageResponse,
  toStaticRegistryRecordResponse,
} from './static-registry.dto';
import {
  STATIC_REGISTRY_READ_PORT,
  type StaticRegistryReadPort,
} from './static-registry-read.port';
import {
  STATIC_REGISTRY_CANONICAL_REF_MAX_LENGTH,
  STATIC_REGISTRY_RECORD_ID_MAX_LENGTH,
  STATIC_REGISTRY_RECORD_ID_PATTERN,
  parseStaticRegistryCanonicalRef,
  parseStaticRegistryRecordId,
} from './static-registry.validation';

@ApiTags('static-registry')
@Controller('static-registry')
export class StaticRegistryController {
  constructor(
    @Inject(STATIC_REGISTRY_READ_PORT)
    private readonly readPort: StaticRegistryReadPort,
  ) {}

  @Get('records/:recordId')
  @ApiOperation({ summary: 'Read immutable static registry metadata by record id' })
  @ApiParam({
    name: 'recordId',
    required: true,
    schema: {
      type: 'string',
      maxLength: STATIC_REGISTRY_RECORD_ID_MAX_LENGTH,
      pattern: STATIC_REGISTRY_RECORD_ID_PATTERN.source,
    },
  })
  @ApiOkResponse({ type: StaticRegistryRecordResponseDto })
  @ApiBadRequestResponse({ type: StaticRegistryErrorResponseDto })
  @ApiNotFoundResponse({ type: StaticRegistryErrorResponseDto })
  async getRecord(
    @Param('recordId') rawRecordId: unknown,
  ): Promise<StaticRegistryRecordResponseDto> {
    const recordId = parseStaticRegistryRecordId(rawRecordId);
    const result = await this.readPort.getRecordById(recordId);
    if (result.kind === 'not-found') {
      throw new NotFoundException('static registry record was not found');
    }
    return toStaticRegistryRecordResponse(result.value);
  }

  @Get('resolve')
  @ApiOperation({ summary: 'Resolve an exact canonicalRef to its static registry lineage' })
  @ApiQuery({
    name: 'canonicalRef',
    required: true,
    schema: {
      type: 'string',
      maxLength: STATIC_REGISTRY_CANONICAL_REF_MAX_LENGTH,
      pattern: '^urn:mmbrn:static:[a-z0-9][a-z0-9._-]{0,127}$',
    },
  })
  @ApiOkResponse({ type: StaticRegistryLineageResponseDto })
  @ApiBadRequestResponse({ type: StaticRegistryErrorResponseDto })
  @ApiNotFoundResponse({ type: StaticRegistryErrorResponseDto })
  async resolveCanonicalRef(
    @Query('canonicalRef') rawCanonicalRef: unknown,
  ): Promise<StaticRegistryLineageResponseDto> {
    const canonicalRef = parseStaticRegistryCanonicalRef(rawCanonicalRef);
    const result = await this.readPort.resolveCanonicalRef(canonicalRef);
    if (result.kind === 'not-found') {
      throw new NotFoundException('static registry lineage was not found');
    }
    return toStaticRegistryLineageResponse(result.value);
  }
}
