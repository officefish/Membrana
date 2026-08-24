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

  /**
   * Настройки отбора библиотеки (#2110) — НЕ форма задания, а ручки человека: форма задания
   * говорит, ЧТО измерять (набор/проба/окно), настройки — как отбирать из измеренного.
   * Негодные значения не подставляются молча: отбор откажет названной причиной.
   */
  @ApiPropertyOptional({ description: 'Объём выборки отбора (200/100/60/20) — только для витрины отбора', example: 20 })
  volume?: number;

  @ApiPropertyOptional({ description: 'Критерий отбора (loudness-over-floor | spectral-variety | drone-likeness)', example: 'loudness-over-floor' })
  criterion?: string;

  @ApiPropertyOptional({ description: 'Обязателен для collections.sample_added (payload M4 несёт sampleId)' })
  sampleId?: string;

  @ApiPropertyOptional({ description: 'Начало окна сеанса, ISO — для родов, идущих по времени (свод сеанса, отбор библиотеки)' })
  from?: string;

  @ApiPropertyOptional({ description: 'Конец окна сеанса, ISO' })
  to?: string;

  /**
   * НАБОР проб, по которым идёт прогон. Заведён блоком c5a спринта `chart-list-plugin`.
   *
   * Прежние три формы выражали «вся коллекция», «одна проба» и «окно времени». Четвёртой —
   * «вот эти двести» — не было, а у отбора по всему журналу окна нет вовсе (Т1 шторма 22.08):
   * записи ленты не лежат подряд во времени и коллекцией не ограничены. Пытаться выразить набор
   * окном значило бы захватить чужое: между первой и последней записью лежит всё, что было между.
   *
   * Набор НЕ отменяет остальные формы и не смешивается с ними: прогон идёт либо по набору, либо
   * по окну, либо по одной пробе. Смесь отвергается на входе — иначе неясно, что именно измерено.
   */
  @ApiPropertyOptional({
    description: 'Набор адресов проб для прогонов, идущих по перечню (отбор чарт-листа). Со sampleId и окном не сочетается',
    type: [String],
  })
  sampleIds?: string[];
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
