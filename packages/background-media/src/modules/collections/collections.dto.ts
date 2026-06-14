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
