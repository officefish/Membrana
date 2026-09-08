import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEVICE_KINDS } from '../../common/swagger/openapi.constants';
import {
  BUFFER_POLICY_DENY_REASONS,
  BUFFER_POLICY_MODES,
  SMART_CLEANUP_SELECTIONS,
} from './buffer-policy';

/** Каркас параметров умной очистки (#2308, M1) — без алгоритма (T12). Все три обязательны. */
export class SmartCleanupParamsDto {
  @ApiProperty({ example: 90, minimum: 1, maximum: 100, description: 'Buffer fill percent that arms cleanup' })
  thresholdPercent!: number;

  @ApiProperty({ enum: SMART_CLEANUP_SELECTIONS, example: 'oldest_first', description: 'Victim selection slot (T12 placeholder)' })
  selection!: (typeof SMART_CLEANUP_SELECTIONS)[number];

  @ApiProperty({ example: true, description: 'Evidence protection: never touch labeled samples' })
  protectLabeled!: boolean;
}

/** Политика переполнения буфера. Умная очистка принимается ТОЛЬКО с полным набором параметров. */
export class BufferPolicyDto {
  @ApiProperty({ enum: BUFFER_POLICY_MODES, example: 'stop' })
  mode!: (typeof BUFFER_POLICY_MODES)[number];

  @ApiPropertyOptional({ type: SmartCleanupParamsDto, nullable: true, description: 'Required for smart_cleanup; null for stop' })
  params?: SmartCleanupParamsDto | null;
}

export class DeviceMembraneContextDto {
  @ApiProperty({ format: 'uuid' })
  membraneId!: string;

  @ApiPropertyOptional({ example: 1, description: 'Tariff contract version copied from cabinet tariff row' })
  tariffContractVersion?: number;

  @ApiProperty({ example: '1073741824', description: 'User storage quota in bytes (string or number)' })
  userStorageQuotaBytes!: string | number;

  @ApiProperty({ example: '1073741824', description: 'Buffer quota in bytes (string or number)' })
  bufferQuotaBytes!: string | number;

  @ApiProperty({ example: 'free-v1-catalog' })
  datasetCatalogId!: string;

  @ApiPropertyOptional({ example: 3, description: 'Max editable device-board workspaces (tariff axis)' })
  maxUserWorkspaces?: number;

  @ApiPropertyOptional({
    type: BufferPolicyDto,
    description:
      'Buffer overflow policy (#2308). Validated by THIS server too: smart_cleanup without full params is refused. Absent = keep stored policy.',
  })
  bufferPolicy?: BufferPolicyDto;
}

/**
 * Ответ разноски контекста: успех или доменный отказ гейта параметров (конвенция 12.08 —
 * `200 { ok:false, reason }`, HTTP-код остаётся транспорту).
 */
export class DeviceMembraneSyncResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiPropertyOptional({ enum: BUFFER_POLICY_DENY_REASONS, description: 'Present only when ok=false' })
  reason?: (typeof BUFFER_POLICY_DENY_REASONS)[number];

  @ApiPropertyOptional({ format: 'uuid' })
  id?: string;

  @ApiPropertyOptional({ example: 'lab-node' })
  name?: string;

  @ApiPropertyOptional({ enum: DEVICE_KINDS })
  kind?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: 1, description: 'Tariff contract version stored after successful sync' })
  tariffContractVersion?: number;

  @ApiPropertyOptional({ type: BufferPolicyDto, description: 'Effective policy after the sync (ok=true only)' })
  bufferPolicy?: BufferPolicyDto;
}

export class RegisterDeviceDto {
  @ApiProperty({ example: 'lab-node' })
  name!: string;

  @ApiProperty({ enum: DEVICE_KINDS, example: 'microphone' })
  kind!: (typeof DEVICE_KINDS)[number];

  @ApiPropertyOptional({ type: DeviceMembraneContextDto })
  membrane?: DeviceMembraneContextDto;
}

export class PatchDeviceMembraneContextDto {
  @ApiProperty({ type: DeviceMembraneContextDto })
  membrane!: DeviceMembraneContextDto;
}

export class DeviceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'lab-node' })
  name!: string;

  @ApiProperty({ enum: DEVICE_KINDS })
  kind!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class ClientDeviceKeyResponseDto {
  @ApiProperty({ format: 'uuid' })
  keyId!: string;

  @ApiProperty({ description: 'Raw client media key; returned once, server stores only sha256(raw).' })
  raw!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  rotatedFrom!: string | null;
}

export class RegisterDeviceResponseDto extends DeviceResponseDto {
  @ApiProperty({ type: ClientDeviceKeyResponseDto })
  clientKey!: ClientDeviceKeyResponseDto;
}

export class QuotaBucketResponseDto {
  @ApiProperty({ example: 1048576 })
  usedBytes!: number;

  @ApiProperty({ example: 1073741824 })
  limitBytes!: number;

  @ApiProperty({ enum: ['server'], example: 'server' })
  backend!: 'server';
}

export class DatasetQuotaInfoResponseDto {
  @ApiProperty({ example: 'free-v1-catalog' })
  catalogId!: string;

  @ApiProperty({ example: 42 })
  sampleCount!: number;
}

export class UserWorkspacesQuotaResponseDto {
  @ApiProperty({ example: 2 })
  used!: number;

  @ApiProperty({ example: 3 })
  limit!: number;

  @ApiProperty({ enum: ['server'], example: 'server' })
  backend!: 'server';
}

export class QuotaResponseDto {
  @ApiProperty({ example: 1, description: 'Tariff contract version stored on the device quota snapshot' })
  tariffContractVersion!: number;

  @ApiProperty({ type: QuotaBucketResponseDto })
  userStorage!: QuotaBucketResponseDto;

  @ApiProperty({ type: QuotaBucketResponseDto })
  buffer!: QuotaBucketResponseDto;

  @ApiProperty({ type: DatasetQuotaInfoResponseDto })
  dataset!: DatasetQuotaInfoResponseDto;

  @ApiProperty({ type: UserWorkspacesQuotaResponseDto })
  userWorkspaces!: UserWorkspacesQuotaResponseDto;

  @ApiProperty({
    type: BufferPolicyDto,
    description: 'Effective buffer overflow policy (#2308): what the device must obey. Absent/corrupt stored value reads as stop.',
  })
  bufferPolicy!: BufferPolicyDto;
}
