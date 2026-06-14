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
