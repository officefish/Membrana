import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEVICE_KINDS } from '../../common/swagger/openapi.constants';

export class DeviceMembraneContextDto {
  @ApiProperty({ format: 'uuid' })
  membraneId!: string;

  @ApiProperty({ example: '1073741824', description: 'User storage quota in bytes (string or number)' })
  userStorageQuotaBytes!: string | number;

  @ApiProperty({ example: '1073741824', description: 'Buffer quota in bytes (string or number)' })
  bufferQuotaBytes!: string | number;

  @ApiProperty({ example: 'free-v1-catalog' })
  datasetCatalogId!: string;

  @ApiPropertyOptional({ example: 3, description: 'Max editable device-board workspaces (tariff axis)' })
  maxUserWorkspaces?: number;
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
  @ApiProperty({ type: QuotaBucketResponseDto })
  userStorage!: QuotaBucketResponseDto;

  @ApiProperty({ type: QuotaBucketResponseDto })
  buffer!: QuotaBucketResponseDto;

  @ApiProperty({ type: DatasetQuotaInfoResponseDto })
  dataset!: DatasetQuotaInfoResponseDto;

  @ApiProperty({ type: UserWorkspacesQuotaResponseDto })
  userWorkspaces!: UserWorkspacesQuotaResponseDto;
}
