import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COLLECTION_KINDS } from '../../common/swagger/openapi.constants';

export class CreateCollectionDto {
  @ApiProperty({ example: 'Field recordings' })
  name!: string;
}

export class CollectionResponseDto {
  @ApiProperty({ example: 'buffer' })
  id!: string;

  @ApiProperty({ example: 'Buffer' })
  name!: string;

  @ApiProperty({ enum: COLLECTION_KINDS })
  kind!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiPropertyOptional({ example: 'tariff-dataset' })
  systemKey?: string;

  @ApiProperty({ example: 120, description: 'Number of samples in this collection' })
  sampleCount!: number;
}

export class ProvisionCatalogResponseDto {
  @ApiProperty({ example: 'free-v1-catalog' })
  catalogId!: string;

  @ApiProperty({ example: 120, description: 'Samples imported this call' })
  seeded!: number;

  @ApiProperty({ example: 0, description: 'Samples already present (skipped)' })
  skipped!: number;

  @ApiProperty({ example: 120, description: 'Total entries in manifest' })
  total!: number;
}

/** Запрос прогона плагина на коллекции (вход `request` хоста `collections`, b4 спринта plugin-results-bridge, #1961). */
export class RequestPluginRunDto {
  @ApiPropertyOptional({
    description: 'Повод из закрытого словаря PLUGIN_TRIGGERS; умолчание collections.collection_created (payload M4: { collectionId, occurredAt })',
    example: 'collections.collection_created',
  })
  trigger?: string;

  @ApiPropertyOptional({ description: 'Обязателен для collections.sample_added (payload M4 несёт sampleId)' })
  sampleId?: string;
}

export class PluginRunResponseDto {
  @ApiProperty({ example: '01a0150f-95e6-718b-bfa7-4ba313511a10', description: 'runId — UUID v7, адрес прогона в доме результатов' })
  runId!: string;

  @ApiProperty({ description: 'RunAddress: pluginId · version · collectionId · runId · mountTarget' })
  address!: Record<string, string>;

  @ApiProperty({ description: 'RunFingerprints: inputHash · configHash' })
  fingerprints!: { inputHash: string; configHash: string };

  @ApiProperty({ description: 'Исход моста в office: sent · office-not-configured · office-unreachable · office-rejected; null — сид не дошёл', nullable: true })
  bridge!: { outcome: string; runId: string; attempts: number; status?: number; reason?: string } | null;
}
