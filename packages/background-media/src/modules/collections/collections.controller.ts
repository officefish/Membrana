import { Body, Controller, Delete, Get, Logger, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiBadRequest, ApiStandardErrors } from '../../common/swagger/api-decorators';
import { OkResponseDto } from '../../common/swagger/common.dto';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { MediaDeviceAccessGuard } from '../../common/guards/media-device-access.guard';
import {
  CollectionResponseDto,
  CreateCollectionDto,
  PluginRunResponseDto,
  ProvisionCatalogResponseDto,
  RequestPluginRunDto,
} from './collections.dto';
import { CatalogProvisionService } from './catalog-provision.service';
import { CollectionsService } from './collections.service';
import { FirstWavePluginsRegistrar } from './first-wave.registrar';
import type { PluginId, PluginTrigger } from './plugin-host.types';

@ApiTags('Collections')
@Controller('v1/devices/:deviceId/collections')
@UseGuards(MediaDeviceAccessGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiHeader({ name: 'X-Membrana-Device-Id', required: false })
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class CollectionsController {
  private readonly logger = new Logger(CollectionsController.name);

  constructor(
    private readonly collections: CollectionsService,
    private readonly catalogProvision: CatalogProvisionService,
    private readonly firstWave: FirstWavePluginsRegistrar,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List collections for device' })
  @ApiResponse({ status: 200, type: [CollectionResponseDto] })
  @ApiStandardErrors()
  list(@Param('deviceId') deviceId: string) {
    return this.collections.list(deviceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create user collection' })
  @ApiResponse({ status: 201, type: CollectionResponseDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  create(@Param('deviceId') deviceId: string, @Body() body: CreateCollectionDto) {
    return this.collections.createUser(deviceId, body.name);
  }

  @Post('ensure-reserved')
  @ApiOperation({ summary: 'Ensure buffer and tariff dataset collections exist; provision free-v1 catalog' })
  @ApiResponse({ status: 200, type: [CollectionResponseDto] })
  @ApiStandardErrors()
  async ensureReserved(@Param('deviceId') deviceId: string) {
    const collections = await this.collections.ensureReserved(deviceId);
    // Catalog seed is eventual work; it must not hold the upload-critical __buffer__ path.
    void this.catalogProvision.provisionTariffCatalogIfNeeded(deviceId).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Deferred catalog provision for ${deviceId}: ${message}`);
    });
    return collections;
  }

  @Post('provision-catalog')
  @ApiOperation({ summary: 'Provision tariff dataset catalog samples (idempotent)' })
  @ApiResponse({ status: 200, type: ProvisionCatalogResponseDto })
  @ApiStandardErrors()
  provisionCatalog(@Param('deviceId') deviceId: string) {
    return this.catalogProvision.provisionTariffCatalogIfNeeded(deviceId);
  }

  @Delete(':collectionId')
  @ApiOperation({ summary: 'Delete user collection' })
  @ApiParam({ name: 'collectionId' })
  @ApiResponse({ status: 200, type: OkResponseDto })
  @ApiStandardErrors()
  @ApiBadRequest()
  async remove(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
  ) {
    await this.collections.delete(deviceId, collectionId);
    return { ok: true };
  }

  @Post(':collectionId/plugins/:pluginId/request')
  @ApiOperation({
    summary: 'Запросить прогон плагина первой волны на коллекции (вход request хоста collections, #1961)',
    description:
      'Контекст прогона собирается сервисом: runId UUID v7, отпечатки тем же чтением, что у прогона, resumeMode fresh; ' +
      'результат уезжает сидом onResult в дом результатов office — исход моста в ответе. Заглушки первой волны — 501.',
  })
  @ApiParam({ name: 'collectionId', format: 'uuid' })
  @ApiParam({ name: 'pluginId', example: 'membrana.handler.mfcc' })
  @ApiResponse({ status: 200, type: PluginRunResponseDto })
  @ApiResponse({ status: 501, description: 'Плагин-заглушка: прогон не определён' })
  @ApiStandardErrors()
  @ApiBadRequest()
  async requestPluginRun(
    @Param('deviceId') deviceId: string,
    @Param('collectionId') collectionId: string,
    @Param('pluginId') pluginId: string,
    @Body() body: RequestPluginRunDto,
  ): Promise<PluginRunResponseDto> {
    // Коллекция обязана принадлежать устройству из пути: иначе токен устройства прогонял бы чужие коллекции.
    await this.collections.getOwned(deviceId, collectionId);
    const outcome = await this.firstWave.requestRun({
      pluginId: pluginId as PluginId,
      collectionId,
      ...(body?.trigger ? { trigger: body.trigger as PluginTrigger } : {}),
      ...(body?.sampleId ? { sampleId: body.sampleId } : {}),
      ...(body?.from ? { from: body.from } : {}),
      ...(body?.to ? { to: body.to } : {}),
    });
    this.logger.log({ deviceId, collectionId, pluginId, runId: outcome.runId, bridge: outcome.bridge?.outcome ?? null }, 'Plugin run requested');
    return { runId: outcome.runId, address: { ...outcome.address }, fingerprints: outcome.fingerprints, bridge: outcome.bridge };
  }

}
