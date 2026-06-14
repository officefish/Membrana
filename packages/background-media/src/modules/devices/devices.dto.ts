import { ApiProperty } from '@nestjs/swagger';
import { DEVICE_KINDS } from '../../common/swagger/openapi.constants';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'lab-node' })
  name!: string;

  @ApiProperty({ enum: DEVICE_KINDS, example: 'microphone' })
  kind!: (typeof DEVICE_KINDS)[number];
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

export class QuotaResponseDto {
  @ApiProperty({ type: QuotaBucketResponseDto })
  userStorage!: QuotaBucketResponseDto;

  @ApiProperty({ type: QuotaBucketResponseDto })
  buffer!: QuotaBucketResponseDto;

  @ApiProperty({ type: DatasetQuotaInfoResponseDto })
  dataset!: DatasetQuotaInfoResponseDto;
}
